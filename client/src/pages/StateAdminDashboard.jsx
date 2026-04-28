import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import {
    Globe, LogOut, TrendingUp, AlertTriangle, CheckCircle2,
    Clock, BarChart2, Flame, MapPin, Bot, RefreshCw
} from 'lucide-react';

// Severity color util
const riskColors = {
    critical: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-600' },
    high:     { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-500' },
    medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', badge: 'bg-yellow-500' },
    low:      { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-500' },
};

function KPICard({ title, value, sub, icon: Icon, color }) {
    return (
        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
            <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                        <p className={`text-3xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</p>
                        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                    </div>
                    {Icon && <Icon className={`w-9 h-9 opacity-20 ${color || 'text-slate-600'}`} />}
                </div>
            </CardContent>
        </Card>
    );
}

export default function StateAdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [complaints, setComplaints] = useState([]);
    const [accidents, setAccidents] = useState([]);
    const [rankings, setRankings] = useState([]);
    const [hotspots, setHotspots] = useState([]);
    const [aiSummary, setAiSummary] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [cRes, aRes, rRes, hRes, dRes] = await Promise.allSettled([
                axios.get('/api/complaints'),
                axios.get('/api/events/accidents?days=30&limit=100'),
                axios.get('/api/analytics/rankings'),
                axios.get('/api/analytics/hotspots?days=90'),
                axios.get('/api/events/dashboard-data')
            ]);

            if (cRes.status === 'fulfilled') setComplaints(cRes.value.data.data || []);
            if (aRes.status === 'fulfilled') setAccidents(aRes.value.data.data || []);
            if (rRes.status === 'fulfilled') setRankings(rRes.value.data.data || []);
            if (hRes.status === 'fulfilled') setHotspots(hRes.value.data.data || []);
            if (dRes.status === 'fulfilled') setAiSummary(dRes.value.data.data?.aiSummary || '');
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    // Derived KPIs
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const pending = complaints.filter(c => c.status === 'pending').length;
    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
    const highAccidents = accidents.filter(a => a.severity === 'high').length;
    const topHotspots = hotspots.filter(h => h.riskLevel === 'critical' || h.riskLevel === 'high').slice(0, 5);

    return (
        <div className="page-wrapper">
            <div className="page-container page-section">


                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 flex items-center gap-2">
                                <Globe className="w-8 h-8 text-blue-600" />
                                State Admin Dashboard
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {user?.jurisdiction?.state || 'State'} — State-wide Intelligence Overview
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {lastUpdated && (
                                <span className="text-xs text-slate-400">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}
                                className="border-slate-200 text-slate-700 hover:bg-slate-100 bg-white">
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleLogout}
                                className="border-slate-200 text-slate-700 hover:bg-slate-100 bg-white">
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <KPICard title="Total Complaints" value={loading ? '…' : total} icon={BarChart2} />
                        <KPICard title="Resolution Rate" value={loading ? '…' : `${resolutionRate}%`}
                            sub="Last 30 days" icon={CheckCircle2} color="text-green-500" />
                        <KPICard title="Pending" value={loading ? '…' : pending}
                            icon={Clock} color="text-yellow-500" />
                        <KPICard title="High Accidents" value={loading ? '…' : highAccidents}
                            sub="Last 30 days" icon={AlertTriangle} color="text-red-500" />
                        <KPICard title="Critical Hotspots" value={loading ? '…' : topHotspots.length}
                            sub="90-day window" icon={Flame} color="text-orange-500" />
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                        {/* City Performance Rankings */}
                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardHeader>
                                <CardTitle className="text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    City Performance Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p className="text-slate-400 text-sm">Loading rankings…</p>
                                ) : rankings.length === 0 ? (
                                    <p className="text-slate-400 text-sm">No ranking data available yet.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-500 border-b border-slate-200">
                                                    <th className="text-left py-2">#</th>
                                                    <th className="text-left py-2">City</th>
                                                    <th className="text-right py-2">Complaints</th>
                                                    <th className="text-right py-2">Resolved %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rankings.slice(0, 8).map((city, idx) => (
                                                    <tr key={city.ulbCode || idx}
                                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 text-slate-500">{idx + 1}</td>
                                                        <td className="py-2 text-slate-800 font-medium">{city.city || city.ulbCode || 'Unknown'}</td>
                                                        <td className="py-2 text-right text-slate-600">{city.totalComplaints ?? '—'}</td>
                                                        <td className="py-2 text-right">
                                                            <span className={`font-semibold ${(city.resolvedPercentage ?? 0) >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                                {city.resolvedPercentage != null ? `${city.resolvedPercentage}%` : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Predictive Accident Hotspots */}
                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardHeader>
                                <CardTitle className="text-slate-800 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-600" />
                                    Predictive Accident Hotspots
                                    <span className="ml-auto text-xs font-normal text-slate-500">90-day model</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p className="text-slate-400 text-sm">Calculating hotspots…</p>
                                ) : hotspots.length === 0 ? (
                                    <p className="text-slate-400 text-sm">
                                        No hotspot data yet. Hotspots are computed from accumulated accident history.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {hotspots.slice(0, 8).map((h, i) => {
                                            const colors = riskColors[h.riskLevel] || riskColors.low;
                                            return (
                                                <div key={i}
                                                    className={`flex items-center justify-between p-3 rounded-lg ${colors.bg}`}>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className={`w-4 h-4 ${colors.text}`} />
                                                        <span className={`text-sm font-medium ${colors.text}`}>
                                                            {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500">{h.count} accidents</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${colors.badge}`}>
                                                            {h.riskLevel.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI City Intelligence Brief */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-xl hover:shadow-2xl transition hover:-translate-y-1 mt-6">
                        <CardHeader>
                            <CardTitle className="text-blue-900 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-blue-600" />
                                AI City Intelligence Brief
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center gap-2 text-blue-700">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Generating AI brief…
                                </div>
                            ) : aiSummary ? (
                                <p className="text-blue-900 text-sm leading-relaxed whitespace-pre-line">{aiSummary}</p>
                            ) : (
                                <p className="text-blue-700 text-sm">
                                    AI brief unavailable. Configure Gemini API key in the backend .env to enable daily intelligence summaries.
                                </p>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import {
    Building2, LogOut, BarChart3, AlertTriangle, CheckCircle2,
    Clock, Tally4, Car, Trash2, Droplets, Zap, RefreshCw, MessageSquare
} from 'lucide-react';
import AIPulseWidget from '@/components/AIPulseWidget';

const STATUS_COLORS = {
    pending:     'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved:    'bg-green-100 text-green-700',
};

const SEVERITY_COLORS = {
    high:   'bg-red-600 text-white',
    medium: 'bg-orange-500 text-white',
    low:    'bg-green-600 text-white',
};

const ISSUE_ICONS = {
    pothole:      <Car className="w-4 h-4" />,
    garbage:      <Trash2 className="w-4 h-4" />,
    water:        <Droplets className="w-4 h-4" />,
    streetlight:  <Zap className="w-4 h-4" />,
};

function KPICard({ title, value, sub, icon: Icon, color, loading }) {
    return (
        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
            <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                        <p className={`text-3xl font-bold mt-1 ${color || 'text-slate-800'}`}>
                            {loading ? <span className="text-slate-300">…</span> : value}
                        </p>
                        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                    </div>
                    {Icon && <Icon className={`w-9 h-9 opacity-20 ${color || 'text-slate-400'}`} />}
                </div>
            </CardContent>
        </Card>
    );
}

const COMPLAINT_TYPES = ['pothole', 'garbage', 'water', 'streetlight', 'other'];

export default function MunicipalAdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [complaints, setComplaints] = useState([]);
    const [accidents, setAccidents] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [cRes, aRes, alRes] = await Promise.allSettled([
                axios.get('/api/complaints'),
                axios.get('/api/events/accidents?days=7&limit=10'),
                axios.get('/api/analytics/alerts?limit=10')
            ]);
            if (cRes.status === 'fulfilled') setComplaints(cRes.value.data.data || []);
            if (aRes.status === 'fulfilled') setAccidents(aRes.value.data.data || []);
            if (alRes.status === 'fulfilled') setAlerts(alRes.value.data.data || []);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    // Derived stats
    const total      = complaints.length;
    const pending    = complaints.filter(c => c.status === 'pending').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved   = complaints.filter(c => c.status === 'resolved').length;
    const resRate    = total ? Math.round((resolved / total) * 100) : 0;

    // Avg resolution time (hours) — only from resolved complaints with timestamps
    const resolvedWithTime = complaints.filter(c => c.status === 'resolved' && c.resolvedAt && c.createdAt);
    const avgResHrs = resolvedWithTime.length
        ? Math.round(resolvedWithTime.reduce((acc, c) => {
              return acc + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3600000;
          }, 0) / resolvedWithTime.length)
        : null;

    // Complaint type breakdown
    const typeCounts = COMPLAINT_TYPES.reduce((acc, t) => {
        acc[t] = complaints.filter(c => (c.type || c.category || '').toLowerCase() === t).length;
        return acc;
    }, {});
    const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

    return (
        <div className="page-wrapper">
            <div className="page-container page-section">


                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-8 h-8 text-blue-600" />
                                Municipal Admin Dashboard
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {user?.jurisdiction?.city || 'City'}, {user?.jurisdiction?.state || 'State'} — Operational Intelligence
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {lastUpdated && (
                                <span className="text-xs text-slate-400">Updated {lastUpdated.toLocaleTimeString()}</span>
                            )}
                            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* AI Pulse Widget */}
                    <AIPulseWidget />

                    {/* 6-Stat KPI Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <KPICard title="Total"      value={total}      icon={Tally4} loading={loading} />
                        <KPICard title="Pending"    value={pending}    icon={Clock}           color="text-yellow-600" loading={loading} />
                        <KPICard title="In Progress" value={inProgress} icon={BarChart3}       color="text-blue-600"  loading={loading} />
                        <KPICard title="Resolved"   value={resolved}   icon={CheckCircle2}    color="text-green-600" loading={loading} />
                        <KPICard title="Resolution Rate" value={`${resRate}%`} icon={CheckCircle2} color={resRate >= 70 ? 'text-green-600' : 'text-yellow-600'} loading={loading} />
                        <KPICard
                            title="Avg Resolve Time"
                            value={avgResHrs != null ? `${avgResHrs}h` : 'N/A'}
                            sub="resolved complaints"
                            icon={Clock}
                            color="text-indigo-600"
                            loading={loading}
                        />
                    </div>

                    {/* Two-column: Complaint Type Breakdown + Recent Accident Log */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                        {/* Complaint Type Breakdown */}
                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-700">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    Complaint Type Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p className="text-slate-400 text-sm">Loading…</p>
                                ) : (
                                    <div className="space-y-3">
                                        {COMPLAINT_TYPES.map(type => {
                                            const count = typeCounts[type];
                                            const pct = Math.round((count / maxTypeCount) * 100);
                                            return (
                                                <div key={type}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 capitalize">
                                                            {ISSUE_ICONS[type] || null}
                                                            {type}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-700">{count}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full transition duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Accident Log */}
                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-700">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Recent Accidents (7 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p className="text-slate-400 text-sm">Loading…</p>
                                ) : accidents.length === 0 ? (
                                    <p className="text-slate-400 text-sm">No accidents recorded in the last 7 days. ✅</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-400 border-b text-left">
                                                    <th className="pb-2">Time</th>
                                                    <th className="pb-2">Severity</th>
                                                    <th className="pb-2">Confidence</th>
                                                    <th className="pb-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {accidents.map((acc) => (
                                                    <tr key={acc._id} className="border-b hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 text-slate-500 text-xs">
                                                            {new Date(acc.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${SEVERITY_COLORS[acc.severity] || 'bg-gray-200 text-gray-700'}`}>
                                                                {acc.severity?.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-slate-600">
                                                            {acc.confidence != null ? `${Math.round(acc.confidence * 100)}%` : '—'}
                                                        </td>
                                                        <td className="py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[acc.status] || 'bg-slate-100 text-slate-600'}`}>
                                                                {acc.status?.replace('_', ' ')}
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
                    </div>

                    {/* SMS Alert Delivery Log */}
                    <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0 mt-6 lg:mt-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                Recent SMS Alert Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p className="text-slate-400 text-sm">Loading…</p>
                            ) : alerts.length === 0 ? (
                                <p className="text-slate-400 text-sm">No alerts dispatched yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-slate-400 border-b text-left">
                                                <th className="pb-2">Time</th>
                                                <th className="pb-2">Recipient</th>
                                                <th className="pb-2">Source</th>
                                                <th className="pb-2">Status</th>
                                                <th className="pb-2">Attempts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alerts.map((al) => (
                                                <tr key={al._id} className="border-b hover:bg-slate-50 transition-colors">
                                                    <td className="py-2 text-slate-500 text-xs">
                                                        {new Date(al.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="py-2 text-slate-600 font-mono text-xs">{al.recipientNumber || '—'}</td>
                                                    <td className="py-2">
                                                        <span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                            {al.source || 'accident'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                            al.smsStatus === 'sent' ? 'bg-green-100 text-green-700' :
                                                            al.smsStatus === 'dlq'  ? 'bg-red-100 text-red-700' :
                                                            al.smsStatus === 'failed' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {al.smsStatus === 'dlq' ? '❌ DLQ' : al.smsStatus?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-slate-500 text-xs">
                                                        {al.retryCount > 0 ? `${al.retryCount} retries` : 'First attempt'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}

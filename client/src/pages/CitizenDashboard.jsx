import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Navbar removed
// Footer removed — provided by MainLayout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import {
    FileText,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    MapPin,
    Calendar,
    Image as ImageIcon,
    LogOut
} from 'lucide-react';
import AIPulseWidget from '@/components/AIPulseWidget';

export default function CitizenDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0
    });

    useEffect(() => {
        fetchMyComplaints();
    }, []);

    const fetchMyComplaints = async () => {
        try {
            const response = await axios.get('/api/complaints');
            setComplaints(response.data.data || []);

            // Calculate stats
            const data = response.data.data || [];
            setStats({
                total: data.length,
                pending: data.filter(c => c.status === 'pending').length,
                inProgress: data.filter(c => c.status === 'in_progress').length,
                resolved: data.filter(c => c.status === 'resolved').length
            });
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
            resolved: 'bg-green-100 text-green-800 border-green-300'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: Clock,
            in_progress: AlertCircle,
            resolved: CheckCircle
        };
        const Icon = icons[status] || Clock;
        return <Icon className="w-4 h-4" />;
    };

    return (
        <div className="page-wrapper">
            <div className="page-container page-section">

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">
                                    Welcome, {user?.name}
                                </h1>
                                <p className="text-slate-600 mt-1">
                                    Citizen Dashboard - View and track your complaints
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* AI Pulse Widget */}
                    <AIPulseWidget />

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Total Complaints</p>
                                        <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                                    </div>
                                    <FileText className="w-10 h-10 text-slate-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Pending</p>
                                        <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                                    </div>
                                    <Clock className="w-10 h-10 text-yellow-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">In Progress</p>
                                        <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                                    </div>
                                    <AlertCircle className="w-10 h-10 text-blue-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-xl hover:shadow-2xl transition hover:-translate-y-1 border-0">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Resolved</p>
                                        <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                                    </div>
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-4 mb-8">
                        <Button
                            onClick={() => navigate('/register')}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Register New Complaint
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/voice')}
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            Voice Report
                        </Button>
                    </div>

                    {/* Complaints List */}
                    <Card className="bg-white shadow-xl border-0">
                        <CardHeader>
                            <CardTitle className="text-slate-800">My Complaints</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="space-y-4 w-full">
                                        <Skeleton className="h-[200px] w-full rounded-2xl" />
                                        <Skeleton className="h-[200px] w-full rounded-2xl" />
                                    </div>
                                    <p className="text-slate-600 mt-4">Loading complaints...</p>
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-600 mb-4">No complaints yet</p>
                                    <Button
                                        onClick={() => navigate('/register')}
                                        className="bg-gradient-to-r from-teal-600 to-cyan-600"
                                    >
                                        Register Your First Complaint
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {complaints.map((complaint) => (
                                        <div
                                            key={complaint._id}
                                            className="bg-white shadow-sm hover:shadow-lg transition hover:-translate-y-1 border border-slate-100 rounded-xl p-4"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-start gap-4">
                                                    {complaint.imageUrl && (
                                                        <img
                                                            src={complaint.imageUrl}
                                                            alt="Complaint"
                                                            className="w-20 h-20 object-cover rounded-lg"
                                                        />
                                                    )}
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 capitalize mb-1">
                                                            {complaint.category} Issue
                                                        </h3>
                                                        <p className="text-sm text-slate-600 mb-2">
                                                            {complaint.department}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(complaint.createdAt).toLocaleDateString()}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                Location
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={getStatusColor(complaint.status)}>
                                                    {getStatusIcon(complaint.status)}
                                                    <span className="ml-1 capitalize">{complaint.status.replace('_', ' ')}</span>
                                                </Badge>
                                            </div>

                                            {/* Trust & Risk Scores */}
                                            <div className="flex gap-4 text-xs text-slate-600 mb-3">
                                                <span>Trust Score: <strong>{complaint.trustScore}</strong></span>
                                                <span>Risk: <strong className="capitalize">{complaint.riskLevel}</strong></span>
                                                {complaint.slaDeadline && (
                                                    <span>
                                                        ETR: <strong>{new Date(complaint.slaDeadline).toLocaleDateString()}</strong>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Latest Update */}
                                            {complaint.updates && complaint.updates.length > 0 && (
                                                <div className="bg-slate-50 rounded p-3 text-sm">
                                                    <p className="text-slate-600">
                                                        <strong>Latest Update:</strong> {complaint.updates[complaint.updates.length - 1].message}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {new Date(complaint.updates[complaint.updates.length - 1].timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
            </div>
        </div>
    );
}

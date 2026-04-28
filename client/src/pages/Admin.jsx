import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Loader2, BarChart3, Clock, CheckCircle, AlertCircle, AlertTriangle, Bell, Volume2, VolumeX } from "lucide-react";
import axios from "axios";
import io from "socket.io-client";
import HeatMap from "@/components/analytics/HeatMap";
import Navbar from "@/components/Navbar";

import { useAuth } from '../context/AuthContext';

export default function Admin() {
    const { user } = useAuth(); // Get user from context
    const [complaints, setComplaints] = useState([]);
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('complaints');
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [newAlertCount, setNewAlertCount] = useState(0);
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    const socketRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        fetchComplaints();
        fetchEmergencies();

        if (isMonitoring) {
            connectToSocket();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isMonitoring]);

    const playAlertSound = () => {
        if (!soundEnabled) return;

        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = 1.0;

        const playOnce = (count) => {
            if (count > 3) return;
            audio.currentTime = 0;
            audio.play().then(() => {
                setAudioUnlocked(true);
                if (count < 3) window.setTimeout(() => playOnce(count + 1), 3000);
            }).catch(e => setAudioUnlocked(false));
        };
        playOnce(1);
    };

    const stopAlertSound = () => {
        try {
            const audio = audioRef.current;
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        } catch (e) {
            console.error(e);
        }
    };

    const connectToSocket = () => {
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🚨 Admin connected to emergency alerts');
            socket.emit('subscribe_emergency_alerts');
        });

        socket.on('NEW_SOS_ALERT', (alertData) => {
            handleNewEmergency(alertData);
        });

        socket.on('EMERGENCY_RESOLVED', (data) => {
            setEmergencies(prev => prev.map(e =>
                (e._id === data.emergencyId || e.id === data.emergencyId)
                    ? { ...e, status: 'resolved', isNew: false, isResolvedSuccess: true }
                    : e
            ));
        });

        // Listen for new standard complaints
        socket.on('NEW_COMPLAINT', (complaint) => {
            console.log('📥 New complaint received via socket:', complaint);
            // Add to list if not already present
            setComplaints(prev => {
                if (prev.some(c => c._id === complaint._id)) return prev;
                return [complaint, ...prev];
            });
            // Optional: Notification sound
            playAlertSound();
        });

        socket.on('disconnect', () => console.log('Disconnected'));
    };

    const handleNewEmergency = (alertData) => {
        if (!alertData) return;
        playAlertSound();
        setNewAlertCount(prev => prev + 1);

        const newEmergency = {
            _id: alertData.complaintId || alertData.id || `temp-${Date.now()}`,
            category: alertData.category || 'unknown',
            emergencyType: alertData.emergencyType || 'emergency',
            riskAssessment: alertData.riskLevel ? { severity: alertData.riskLevel } : { severity: 'high' },
            location: { coordinates: alertData.location?.coordinates || [0, 0] },
            createdAt: alertData.timestamp || new Date(),
            slaDeadline: alertData.slaDeadline,
            slaDuration: alertData.slaDuration,
            status: 'pending',
            isNew: true
        };

        setEmergencies(prev => [newEmergency, ...prev]);
        setActiveTab('emergencies');
    };

    const fetchComplaints = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/complaints");
            setComplaints(res.data.success ? res.data.data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmergencies = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/emergencies");
            setEmergencies(res.data.success ? (res.data.data || []) : []);
        } catch (error) {
            console.error(error);
        }
    };

    const updateStatus = async (id, newStatus) => {
        setComplaints(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
        try {
            await axios.patch(`http://localhost:5000/api/complaints/${id}/status`, { status: newStatus });
        } catch (error) {
            console.error(error);
        }
    };

    const updateEmergencyStatus = async (id, newStatus) => {
        setEmergencies(prev => prev.map(e => e._id === id ? { ...e, status: newStatus, isNew: false } : e));
        try {
            await axios.patch(`http://localhost:5000/api/emergencies/${id}/status`, { status: newStatus });
            if (socketRef.current) {
                socketRef.current.emit('START_SOS_TIMER', {
                    emergencyId: id,
                    status: newStatus,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const acknowledgeEmergency = async (id) => {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setEmergencies(prev => prev.map(e => e._id === id ? { ...e, isNew: false, verificationCode: otp } : e));
        setNewAlertCount(prev => Math.max(0, prev - 1));
        stopAlertSound();

        try {
            await axios.patch(`http://localhost:5000/api/emergencies/${id}/status`, { verificationCode: otp });
            const emergency = emergencies.find(e => e._id === id);
            if (socketRef.current && emergency) {
                socketRef.current.emit('EMERGENCY_ACKNOWLEDGED', {
                    emergencyId: id,
                    ...emergency,
                    verificationCode: otp,
                    acknowledgedBy: 'Admin',
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
        emergencies: emergencies.length,
        emergencyPending: emergencies.filter(e => e.status === 'pending').length
    };

    // Safe card style generator
    const getEmergencyCardStyle = (e) => {
        const isResolved = e.status === 'resolved' || e.isResolvedSuccess;
        if (isResolved) return 'bg-green-50 shadow-md border-green-200';
        if (e.isNew) return 'border-2 border-red-500 animate-pulse bg-red-100 shadow-xl';
        return 'bg-white shadow-md border-slate-200';
    };

    return (
        <div className="page-wrapper">
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
            <div className="page-container page-section space-y-6">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">Admin Dashboard</h1>
                        <p className="text-slate-500 mt-1">
                            {user ? (
                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-sm border border-yellow-500/30">
                                    {user.name} ({user.role}) • {user.jurisdiction?.city || 'Unknown City'}
                                </span>
                            ) : 'Loading User Data...'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={playAlertSound} className={audioUnlocked ? 'text-green-300' : 'text-blue-300'}>
                            🔊 {audioUnlocked ? 'Sound Ready' : 'Enable Sound'}
                        </Button>
                        <Button asChild variant="outline" size="sm" className="bg-white text-slate-700 hover:bg-slate-100">
                            <Link to="/">Exit</Link>
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-12 w-full max-w-sm rounded-lg" />
                        <Skeleton className="h-[600px] w-full rounded-2xl mt-8" />
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <Card className="bg-blue-600 shadow-lg border-0 text-white"><CardContent className="p-4"><p>Total</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
                            <Card className="bg-amber-600 shadow-lg border-0 text-white"><CardContent className="p-4"><p>Pending</p><p className="text-3xl font-bold">{stats.pending}</p></CardContent></Card>
                            <Card className="bg-teal-600 shadow-lg border-0 text-white"><CardContent className="p-4"><p>In Progress</p><p className="text-3xl font-bold">{stats.inProgress}</p></CardContent></Card>
                            <Card className="bg-emerald-600 shadow-lg border-0 text-white"><CardContent className="p-4"><p>Resolved</p><p className="text-3xl font-bold">{stats.resolved}</p></CardContent></Card>
                            <Card className="bg-red-600 shadow-lg border-0 text-white"><CardContent className="p-4"><p>Emergencies</p><p className="text-3xl font-bold">{stats.emergencies}</p></CardContent></Card>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button onClick={() => setActiveTab('complaints')} variant={activeTab === 'complaints' ? 'default' : 'outline'}>Complaints</Button>
                            <Button onClick={() => { setActiveTab('emergencies'); setNewAlertCount(0); }} variant={activeTab === 'emergencies' ? 'destructive' : 'outline'}>
                                Emergencies {newAlertCount > 0 && `(${newAlertCount} NEW)`}
                            </Button>
                            <Button onClick={() => setActiveTab('heatmap')} variant={activeTab === 'heatmap' ? 'secondary' : 'outline'} className={activeTab === 'heatmap' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}>
                                🗺️ Heatmap
                            </Button>
                        </div>

                        {activeTab === 'heatmap' && (
                            <div className="h-[600px] mt-6 animate-in fade-in zoom-in duration-300">
                                <HeatMap />
                            </div>
                        )}

                        {activeTab === 'complaints' && (
                            <Card className="bg-white shadow-xl hover:shadow-2xl transition border-0 mt-6"><CardContent className="p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Complaints</h2>
                                <div className="space-y-4">
                                    {complaints.map(c => (
                                        <div key={c._id} className="flex gap-4 p-4 items-start text-slate-800 border-b border-slate-100 hover:bg-slate-50 transition-colors rounded-lg">
                                            {/* Image */}
                                            <div className="w-24 h-24 flex-shrink-0 bg-black/20 rounded-md overflow-hidden border border-white/10">
                                                {c.imageUrl ? (
                                                    <img
                                                        src={c.imageUrl}
                                                        alt="Complaint"
                                                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                                                        onClick={() => window.open(c.imageUrl, '_blank')}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Image</div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg capitalize truncate">{c.category}</h3>
                                                    <BadgeStatus status={c.status} />
                                                    {c.riskLevel === 'critical' && <Badge className="bg-red-500 animate-pulse">CRITICAL</Badge>}
                                                </div>

                                                <p className="text-sm text-slate-500 mb-2">
                                                    {c.department} • <span className="font-mono text-xs opacity-70">ID: {c._id.slice(-6)}</span>
                                                </p>

                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-400">
                                                    <span title="Trust Score" className="flex items-center gap-1">
                                                        🛡️ {c.trustScore || 50}% Trust
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        📍 {c.location?.coordinates?.[1].toFixed(4)}, {c.location?.coordinates?.[0].toFixed(4)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        🕒 {new Date(c.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {/* Classification Metadata */}
                                                {c.classificationSource && (
                                                    <div className="mt-3 pt-3 border-t border-white/10">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs text-slate-500">
                                                                {c.classificationSource === 'rule_based_filename' ? '🔍 System Detected:' :
                                                                    c.classificationSource === 'ai_vision' ? '🤖 AI Detected:' :
                                                                        c.classificationSource === 'manual' ? '👤 Manual Entry:' :
                                                                            '📝 Detected:'}
                                                            </span>
                                                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                                                {c.autoDetectedCategory || c.category}
                                                            </Badge>
                                                            <span className="text-xs text-slate-400">
                                                                Confidence: {c.classificationConfidence !== undefined ?
                                                                    (c.classificationConfidence === 1.0 ? 'High' :
                                                                        c.classificationConfidence > 0.7 ? 'Medium' : 'Low') :
                                                                    'N/A'}
                                                            </span>
                                                            {c.classificationSource === 'rule_based_filename' && (
                                                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                                                    Automated Rule Engine
                                                                </Badge>
                                                            )}
                                                            {c.requiresManualReview && (
                                                                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                                                    ⚠️ Needs Review
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 items-end">
                                                <Select onValueChange={(val) => updateStatus(c._id, val)} defaultValue={c.status}>
                                                    <SelectTrigger aria-label="Update complaint status" className="w-[140px] bg-white text-slate-800 border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                                        <SelectItem value="resolved">Resolved</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent></Card>
                        )}

                        {activeTab === 'emergencies' && (
                            <Card className="bg-red-50 mt-6 border-red-200 shadow-xl"><CardContent className="p-6">
                                <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-red-800">Emergencies</h2><Button size="sm" onClick={fetchEmergencies}>Refresh</Button></div>
                                <div className="space-y-4">
                                    {emergencies.map(e => {
                                        const isResolved = e.status === 'resolved' || e.isResolvedSuccess;
                                        return (
                                            <Card key={e._id} className={`relative ${getEmergencyCardStyle(e)}`}>
                                                {isResolved && <div className="absolute top-2 right-2"><Badge className="bg-green-500">RESOLVED</Badge></div>}
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className={`text-lg font-bold capitalize ${isResolved ? 'text-green-700' : 'text-red-800'}`}>{e.emergencyType?.replace('_', ' ') || 'Emergency'}</h3>
                                                            {!isResolved && <Badge className="mt-1">{e.riskAssessment?.severity || 'High'}</Badge>}
                                                            <p className="text-slate-500 text-sm mt-2">ID: {e._id}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {e.isNew && !isResolved && <Button size="sm" onClick={() => acknowledgeEmergency(e._id)}>✅ Acknowledge</Button>}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                    {emergencies.length === 0 && <p className="text-slate-500 text-center">No emergencies found.</p>}
                                </div>
                            </CardContent></Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function BadgeStatus({ status }) {
    const color = status === 'resolved' ? 'bg-green-500' : status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500';
    return <Badge className={color}>{status}</Badge>;
}

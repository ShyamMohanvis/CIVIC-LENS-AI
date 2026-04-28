import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { Wrench, Clock, CheckCircle, AlertTriangle, LogOut, Siren, X, MapPin, ShieldAlert, User, KeyRound, Loader2 } from 'lucide-react';
import io from "socket.io-client";
import AIPulseWidget from '@/components/AIPulseWidget';

export default function OperatorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [assignedComplaints, setAssignedComplaints] = useState([]);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [escalatedEmergencies, setEscalatedEmergencies] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    // Verification State
    const [otpInput, setOtpInput] = useState("");
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetchAssignedComplaints();
        fetchActiveEmergencies();
        fetchReviewQueue();

        // Socket Connection
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ Operator connected to socket');
        });

        socket.on('EMERGENCY_ESCALATED', (data) => {
            console.log('🔥 NEW ESCALATION RECEIVED:', data);

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.error(e));

            // Prevent duplicates (String comparison)
            setEscalatedEmergencies(prev => {
                if (prev.some(e => String(e.id) === String(data.emergencyId))) return prev;
                return [{
                    id: data.emergencyId,
                    timestamp: data.timestamp,
                    isNew: true
                }, ...prev];
            });
        });

        socket.on('EMERGENCY_ACKNOWLEDGED', (data) => {
            console.log('⚠️ NEW ACTIVE ALERT:', data);
            setActiveAlerts(prev => {
                const idToCheck = data.emergencyId || data._id || data.id;
                if (prev.some(e => String(e.id || e._id) === String(idToCheck))) return prev;
                return [{
                    ...data,
                    id: idToCheck,
                    isNew: true
                }, ...prev];
            });
        });

        socket.on('EMERGENCY_RESOLVED', (data) => {
            console.log('✅ EMERGENCY RESOLVED:', data);
            const resolvedId = String(data.emergencyId);

            // Update Active Alerts: Mark as Resolved
            setActiveAlerts(prev => prev.map(a =>
                String(a.id || a._id) === resolvedId
                    ? { ...a, status: 'resolved', isResolvedSuccess: true }
                    : a
            ));

            // Update Modal if open
            setSelectedAlert(prev => {
                if (prev && String(prev.id || prev._id) === resolvedId) {
                    return { ...prev, status: 'resolved', isResolvedSuccess: true };
                }
                return prev;
            });
        });

        return () => {
            socket.disconnect();
        };

    }, []);

    // 🛡️ SAFETY NET: Auto-remove Escalated items if they are Resolved in Active list
    useEffect(() => {
        const resolvedIds = activeAlerts
            .filter(a => a.status === 'resolved' || a.isResolvedSuccess)
            .map(a => String(a.id || a._id));

        if (resolvedIds.length > 0) {
            setEscalatedEmergencies(prev => {
                const newEscalated = prev.filter(e => !resolvedIds.includes(String(e.id)));
                if (newEscalated.length !== prev.length) {
                    return newEscalated;
                }
                return prev;
            });
        }
    }, [activeAlerts]);

    const fetchActiveEmergencies = async () => {
        try {
            const response = await axios.get('/api/emergencies');
            if (response.data.success) {
                const active = response.data.data.filter(e => e.status !== 'resolved');
                setActiveAlerts(active.map(e => ({
                    ...e,
                    id: e._id,
                    timestamp: e.createdAt,
                    acknowledgedBy: 'Admin'
                })));
            }
        } catch (error) {
            console.error('Failed to fetch emergencies:', error);
        }
    };

    const fetchAssignedComplaints = async () => {
        try {
            const response = await axios.get('/api/complaints');
            setAssignedComplaints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewQueue = async () => {
        try {
            const response = await axios.get('/api/complaints/queue/review');
            if (response.data.success) setReviewQueue(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch review queue:', error);
        }
    };

    const handleReviewSubmit = async (complaintId, overrideCategory = null) => {
        try {
            const payload = overrideCategory ? { category: overrideCategory, notes: 'Operator overridden classification' } : { notes: 'Operator approved AI classification' };
            const res = await axios.patch(`/api/complaints/${complaintId}/review`, payload);
            if (res.data.success) {
                setReviewQueue(prev => prev.filter(c => c._id !== complaintId));
                fetchAssignedComplaints();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to submit review decision');
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length < 4) return;
        setVerifying(true);
        try {
            const id = selectedAlert.id || selectedAlert._id;
            const res = await axios.post(`http://localhost:5000/api/emergencies/${id}/verify`, { otp: otpInput });

            if (res.data.success) {
                const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
                successAudio.play().catch(e => { });

                const resolvedId = String(id);

                // 1. Force Modal Success State
                setSelectedAlert(prev => ({ ...prev, status: 'resolved', isResolvedSuccess: true }));

                // 2. Mark in Feed (This will trigger the Safety Net Effect to clean Escalations)
                setActiveAlerts(prev => prev.map(a =>
                    String(a.id || a._id) === resolvedId
                        ? { ...a, status: 'resolved', isResolvedSuccess: true }
                        : a
                ));
            }
        } catch (err) {
            console.error(err);
            alert("❌ Verification Failed: " + (err.response?.data?.error || "Invalid OTP"));
            // Modal stays open
        } finally {
            setVerifying(false);
        }
    };
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="page-wrapper">
            <div className="page-container page-section">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            <Wrench className="w-8 h-8 inline mr-2" />
                            Operator Dashboard
                        </h1>
                        <p className="text-slate-600 mt-1">
                            {user?.name} - {user?.jurisdiction?.department} ({user?.jurisdiction?.ward})
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>

                {/* AI Pulse Widget */}
                <AIPulseWidget />

                {/* Escalated Emergencies */}
                {escalatedEmergencies.length > 0 && (
                    <Card className="mb-8 border-red-500 bg-red-50 animate-pulse">
                        <CardHeader className="flex flex-row items-center gap-2">
                            <Siren className="w-6 h-6 text-red-600 animate-bounce" />
                            <CardTitle className="text-red-700">🔥 URGENT: Escalated Emergencies</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {escalatedEmergencies.map((emergency, index) => (
                                    <div key={emergency.id} className="bg-white border-2 border-red-400 rounded-lg p-4 shadow-lg flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-red-700 text-lg">CRITICAL ALERT: Timer Expired</h3>
                                            <p className="text-sm text-red-600">Emergency ID: {emergency.id}</p>
                                            <p className="text-xs text-slate-500">Escalated at: {formatDate(emergency.timestamp)}</p>
                                        </div>
                                        <Button
                                            className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                                            onClick={() => {
                                                const alert = activeAlerts.find(a => String(a.id || a._id) === String(emergency.id));
                                                if (alert) setSelectedAlert(alert);
                                                else {
                                                    const confirmFetch = window.confirm("Details not found locally. Fetch active emergencies?");
                                                    if (confirmFetch) fetchActiveEmergencies();
                                                }
                                            }}
                                        >
                                            RESPOND NOW
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Active/Resolved Alerts */}
                <Card className="mb-8 border-slate-200 bg-slate-50">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                        <CardTitle className="text-slate-800">Emergency Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activeAlerts.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No active emergencies.</p>
                            ) : activeAlerts.map((alert) => (
                                alert.isResolvedSuccess ? (
                                    // ✅ RESOLVED SUCCESS CARD (Green Theme)
                                    <div key={alert.id || alert._id} className="bg-green-50 border-2 border-green-500 rounded-lg p-6 shadow-md flex items-center gap-4 animate-in fade-in zoom-in duration-500">
                                        <div className="bg-green-100 p-3 rounded-full">
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-green-800">Emergency Resolved Successfully</h3>
                                            <p className="text-sm text-green-700 font-medium">
                                                Verification Complete & Issue Closed
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">ID: {alert.id || alert._id}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="border-green-200 text-green-700 hover:bg-green-100"
                                            onClick={() => setActiveAlerts(prev => prev.filter(a => (a.id || a._id) !== (alert.id || alert._id)))}
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                ) : (
                                    // ⚠️ ACTIVE ALERT CARD
                                    <div key={alert.id || alert._id} className="bg-white border border-amber-200 rounded-lg p-4 shadow-md flex justify-between items-center hover:shadow-lg transition-shadow">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full animate-ping ${alert.isNew ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                                                <h3 className="font-bold text-slate-800 text-lg capitalize">
                                                    {alert.emergencyType?.replace('_', ' ') || alert.category || 'Emergency Alert'}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-slate-600">
                                                Acknowledged by: <span className="font-semibold text-teal-600">{alert.acknowledgedBy || 'Admin'}</span>
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {formatDate(alert.timestamp)}
                                                </span>
                                                <span className="text-amber-600 font-medium">Standing by for assignment...</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-amber-500 text-amber-700 hover:bg-amber-50"
                                                onClick={() => {
                                                    setSelectedAlert(alert);
                                                    setOtpInput("");
                                                }}
                                            >
                                                View Details / Verify
                                            </Button>
                                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                                                Prepare Team
                                            </Button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* AI Review Queue */}
                <Card className="mb-8 border-indigo-200 bg-indigo-50/30">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-indigo-600" />
                        <CardTitle className="text-slate-800">AI Human Review Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && reviewQueue.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">Loading queue...</div>
                        ) : reviewQueue.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">
                                <CheckCircle className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
                                No pending AI reviews required.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviewQueue.map((review) => (
                                    <div key={review._id} className="bg-white border border-indigo-100 rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <Badge variant="outline" className="mb-2 bg-indigo-50 text-indigo-700 border-indigo-200">
                                                    {review.classificationSource === 'detectron2_detectron2' ? 'Detectron2 CV' : 'AI Model'}
                                                </Badge>
                                                <h3 className="font-bold text-slate-800 capitalize">
                                                    Suggested: {review.aiSuggestedCategory || review.category}
                                                </h3>
                                                <p className="text-sm text-slate-600">
                                                    Confidence: <strong className={review.aiConfidence < 0.6 ? 'text-red-600' : 'text-amber-600'}>
                                                        {(review.aiConfidence * 100).toFixed(0)}%
                                                    </strong>
                                                </p>
                                                {review.imageUrl && (
                                                    <div className="mt-3">
                                                        <img src={`http://localhost:5000${review.imageUrl}`} alt="Evidence" className="h-24 w-24 object-cover rounded-md border" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full" onClick={() => handleReviewSubmit(review._id, null)}>
                                                    Approve AI
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 w-full" onClick={() => {
                                                    const newCat = prompt(`Override category for this issue:`, review.aiSuggestedCategory || review.category);
                                                    if (newCat && newCat !== (review.aiSuggestedCategory || review.category)) {
                                                        handleReviewSubmit(review._id, newCat);
                                                    }
                                                }}>
                                                    Override
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Assigned Complaints</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="space-y-4 px-4 w-full max-w-4xl mx-auto">
                                    <Skeleton className="h-[120px] w-full rounded-xl" />
                                    <Skeleton className="h-[120px] w-full rounded-xl" />
                                    <Skeleton className="h-[120px] w-full rounded-xl" />
                                </div>
                            </div>
                        ) : assignedComplaints.length === 0 ? (
                            <div className="text-center py-12 text-slate-600">
                                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>No complaints assigned to you yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {assignedComplaints.map((complaint) => (
                                    <div key={complaint._id} className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-slate-800 capitalize">
                                                    {complaint.category} Issue
                                                </h3>
                                                <p className="text-sm text-slate-600">{complaint.department}</p>
                                            </div>
                                            <Badge className={
                                                complaint.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                    complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                            }>
                                                {complaint.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Details + Verification Modal */}
                {selectedAlert && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-lg bg-white shadow-2xl relative overflow-hidden transition duration-500">
                            {selectedAlert.isResolvedSuccess ? (
                                // ✅ MODAL SUCCESS STATE
                                <>
                                    <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                                    <CardContent className="p-12 text-center space-y-6">
                                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                            <CheckCircle className="w-12 h-12 text-green-600" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-slate-800">Verified & Resolved!</h2>
                                        <p className="text-slate-600 text-lg">
                                            The emergency has been successfully verified and closed.
                                        </p>
                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg h-12"
                                            onClick={() => setSelectedAlert(null)}
                                        >
                                            Close
                                        </Button>
                                    </CardContent>
                                </>
                            ) : (
                                // ⚠️ MODAL NORMAL STATE
                                <>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-red-600"></div>

                                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge variant="outline" className="mb-2 border-red-200 bg-red-50 text-red-700">
                                                    {selectedAlert.riskAssessment?.severity?.toUpperCase() || 'HIGH PRIORITY'}
                                                </Badge>
                                                <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                                    {selectedAlert.emergencyType?.replace('_', ' ').toUpperCase() || 'EMERGENCY ALERT'}
                                                </CardTitle>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedAlert(null)}>
                                                ✕
                                            </Button>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 space-y-6">
                                        {/* Verification Section */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-inner">
                                            <h4 className="flex items-center gap-2 font-bold text-blue-800 mb-3">
                                                Citizen Verification
                                            </h4>
                                            <p className="text-sm text-blue-600 mb-4">
                                                Ask the citizen for the 4-digit verification code.
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    maxLength={4}
                                                    placeholder="0 0 0 0"
                                                    value={otpInput}
                                                    onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                                                    className="flex-1 text-center text-2xl font-mono tracking-widest p-2 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                />
                                                <Button
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-bold"
                                                    onClick={handleVerifyOtp}
                                                    disabled={verifying || otpInput.length < 4}
                                                >
                                                    {verifying ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        "VERIFY"
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                                                <p className="font-medium text-amber-600 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                    Active / Acknowledged
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">Time Reported</p>
                                                <p className="font-medium text-slate-900">{formatDate(selectedAlert.timestamp)}</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Location</p>
                                                    <p className="text-sm text-slate-500">
                                                        Lat: {selectedAlert.location?.coordinates?.[1] || 'N/A'},
                                                        Lng: {selectedAlert.location?.coordinates?.[0] || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="bg-slate-50 p-4 flex justify-between gap-4 border-t border-slate-100">
                                        <Button variant="outline" className="w-full" onClick={() => setSelectedAlert(null)}>Close</Button>
                                    </CardFooter>
                                </>
                            )}
                        </Card>
                    </div>
                )}
                <style jsx>{`
                   @keyframes zoom-in {
                       0% { transform: scale(0.95); opacity: 0; }
                       100% { transform: scale(1); opacity: 1; }
                   }
                   .zoom-in {
                       animation: zoom-in 0.3s ease-out forwards;
                   }
                `}</style>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, MapPin, Phone, CheckCircle, Bell, BellOff } from "lucide-react";
import axios from "axios";
import io from "socket.io-client";
// Navbar removed

export default function EmergencyDashboard() {
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMonitoring, setIsMonitoring] = useState(true);
    const [unacknowledged, setUnacknowledged] = useState(new Set());

    const socketRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        // Initialize alert sound from CDN (same as Admin panel)
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 1.0; // MAX VOLUME

        // Fetch initial emergencies
        fetchEmergencies();

        // Connect to Socket.IO for real-time alerts
        if (isMonitoring) {
            connectToEmergencyChannel();
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isMonitoring]);

    const connectToEmergencyChannel = () => {
        // Connect to main socket
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🚨 Connected to emergency alerts');
            // Subscribe to emergency alerts
            socket.emit('subscribe_emergency_alerts');
        });

        // Listen for new SOS alerts
        socket.on('NEW_SOS_ALERT', (alertData) => {
            console.log('🚨 NEW SOS ALERT RECEIVED:', alertData);
            handleNewSOSAlert(alertData);
        });

        // Listen for acknowledgements
        socket.on('emergency_acknowledged', ({ emergencyId }) => {
            setUnacknowledged(prev => {
                const newSet = new Set(prev);
                newSet.delete(emergencyId);
                return newSet;
            });
        });

        socket.on('disconnect', () => {
            console.log('🚨 Disconnected from emergency alerts');
        });

        // Also connect to dedicated emergency namespace
        const emergencySocket = io('http://localhost:5000/emergency');
        emergencySocket.on('NEW_SOS', (alertData) => {
            console.log('🚨 NEW SOS (Emergency Channel):', alertData);
        });
    };

    const handleNewSOSAlert = (alertData) => {
        // Play alert sound (plays once, not looped)
        playAlertSound();

        // Add to unacknowledged set
        setUnacknowledged(prev => new Set([...prev, alertData.complaintId]));

        // Add to emergencies list at top
        setEmergencies(prev => {
            const newEmergency = {
                _id: alertData.complaintId,
                category: alertData.category,
                emergencyType: alertData.emergencyType,
                riskAssessment: {
                    severity: alertData.riskLevel
                },
                location: {
                    coordinates: alertData.location.coordinates
                },
                createdAt: alertData.timestamp,
                slaDeadline: alertData.slaDeadline,
                slaDuration: alertData.slaDuration,
                status: 'pending',
                isNew: true
            };
            return [newEmergency, ...prev];
        });

        // Flash notification
        if (document.hidden) {
            // If tab is not active, show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🚨 NEW EMERGENCY ALERT', {
                    body: `${alertData.emergencyType} - ${alertData.riskLevel} risk`,
                    icon: '/emergency-icon.png',
                    requireInteraction: true
                });
            }
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const playAlertSound = () => {
        if (audioRef.current && isMonitoring) {
            const audio = audioRef.current;
            let playCount = 0;
            const maxPlays = 3;

            const playOnce = () => {
                audio.currentTime = 0;
                audio.play().catch(err => {
                    console.error('Failed to play alert sound:', err);
                });
                playCount++;
                console.log(`🔊 Alert sound playing (${playCount}/${maxPlays})`);
            };

            audio.onended = () => {
                if (playCount < maxPlays) {
                    playOnce();
                }
            };

            playOnce(); // Start first play
        }
    };

    const fetchEmergencies = async () => {
        setLoading(true);
        try {
            const res = await axios.get("http://localhost:5000/api/emergencies");
            if (res.data.success) {
                setEmergencies(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch emergencies", error);
        } finally {
            setLoading(false);
        }
    };

    const acknowledgeEmergency = (emergencyId) => {
        // Stop alert sound
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Remove from unacknowledged
        setUnacknowledged(prev => {
            const newSet = new Set(prev);
            newSet.delete(emergencyId);
            return newSet;
        });

        // Emit acknowledgement to socket
        if (socketRef.current) {
            socketRef.current.emit('acknowledge_emergency', emergencyId);
        }

        // Update UI
        setEmergencies(prev =>
            prev.map(e =>
                e._id === emergencyId ? { ...e, isNew: false } : e
            )
        );
    };

    const startAction = async (emergencyId) => {
        acknowledgeEmergency(emergencyId);

        try {
            await axios.patch(`http://localhost:5000/api/emergencies/${emergencyId}/status`, {
                status: 'dispatched',
                respondingAgency: 'Emergency Response Team',
                respondingOfficer: 'Admin'
            });

            fetchEmergencies();
        } catch (error) {
            console.error('Failed to update emergency:', error);
        }
    };

    const toggleMonitoring = () => {
        setIsMonitoring(!isMonitoring);
        if (!isMonitoring) {
            connectToEmergencyChannel();
        } else if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };

    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            low: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
            medium: "bg-orange-500/20 text-orange-700 border-orange-500/30",
            high: "bg-red-500/20 text-red-700 border-red-500/30",
            critical: "bg-red-600/30 text-red-900 border-red-600/50 animate-pulse"
        };
        return colors[severity] || colors.medium;
    };

    return (
        <div className="page-wrapper bg-red-50 dark:bg-red-950/20">
            <div className="page-container page-section space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                            🚨 Emergency Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">Real-time SOS monitoring</p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant={isMonitoring ? "default" : "outline"}
                            onClick={toggleMonitoring}
                            className={isMonitoring ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {isMonitoring ? (
                                <>
                                    <Bell className="w-4 h-4 mr-2" />
                                    Monitoring Active
                                </>
                            ) : (
                                <>
                                    <BellOff className="w-4 h-4 mr-2" />
                                    Monitoring Paused
                                </>
                            )}
                        </Button>

                        <Button variant="outline" onClick={requestNotificationPermission}>
                            Enable Notifications
                        </Button>

                        <Button asChild variant="ghost">
                            <Link to="/">← Back</Link>
                        </Button>
                    </div>
                </div>

                {/* Monitoring Status */}
                {isMonitoring && (
                    <Card className="bg-green-50 border-green-200 shadow-sm mt-6">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                                <span className="font-semibold text-green-900">
                                    🟢 Emergency Monitoring: ACTIVE
                                </span>
                                <span className="text-sm text-green-700">
                                    Real-time alerts enabled • Sound notifications on
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                    <Card className="bg-white shadow-xl border-0 hover:-translate-y-1 transition">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-slate-800">{emergencies.length}</div>
                            <div className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Total Emergencies</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-xl border-0 hover:-translate-y-1 transition">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-red-600">{unacknowledged.size}</div>
                            <div className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Unacknowledged</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-xl border-0 hover:-translate-y-1 transition">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-orange-600">
                                {emergencies.filter(e => e.status === 'pending').length}
                            </div>
                            <div className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Pending</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white shadow-xl border-0 hover:-translate-y-1 transition">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-600">
                                {emergencies.filter(e => e.status === 'resolved').length}
                            </div>
                            <div className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Resolved</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Emergencies List */}
                <div className="space-y-4 mt-6">
                    {loading ? (
                        <Card className="bg-white shadow-xl border-0">
                            <CardContent className="p-12 text-center">
                                <p className="text-muted-foreground">Loading emergencies...</p>
                            </CardContent>
                        </Card>
                    ) : emergencies.length === 0 ? (
                        <Card className="bg-white shadow-xl border-0">
                            <CardContent className="p-12 text-center">
                                <p className="text-muted-foreground">No emergencies reported</p>
                            </CardContent>
                        </Card>
                    ) : (
                        emergencies.map((emergency) => {
                            const isUnack = unacknowledged.has(emergency._id);

                            return (
                                <Card
                                    key={emergency._id}
                                    className={`bg-white hover:shadow-2xl transition border-0 ${isUnack ? 'border-4 border-red-600 shadow-2xl animate-pulse' : 'shadow-xl'} ${emergency.isNew ? 'bg-red-50' : ''}`}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    {isUnack && (
                                                        <span className="text-3xl animate-bounce">🔴</span>
                                                    )}
                                                    <CardTitle className="text-xl capitalize">
                                                        {emergency.emergencyType?.replace('_', ' ') || emergency.category}
                                                    </CardTitle>
                                                    <Badge className={`${getSeverityColor(emergency.riskAssessment?.severity)} border`}>
                                                        {emergency.riskAssessment?.severity?.toUpperCase() || 'MEDIUM'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    ID: {emergency._id.slice(-8)}
                                                </p>
                                            </div>

                                            {isUnack && (
                                                <div className="space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => acknowledgeEmergency(emergency._id)}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        ACKNOWLEDGE
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={() => startAction(emergency._id)}
                                                    >
                                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                                        START ACTION
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-600" />
                                                <span>
                                                    {emergency.location.coordinates[1].toFixed(4)}, {emergency.location.coordinates[0].toFixed(4)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-orange-600" />
                                                <span>ETR: {emergency.slaDuration} min</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-green-600" />
                                                <span>{emergency.nearbyServices?.length || 3} services nearby</span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            Reported: {new Date(emergency.createdAt).toLocaleString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { MapPin, RefreshCw, Bell, AlertTriangle, Clock, CheckCircle2, Building2 } from "lucide-react";
import axios from "axios";
import io from "socket.io-client";

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_STEPS = ["filed", "verified", "assigned", "in_progress", "resolved"];
const STATUS_LABELS = ["FILED", "VERIFIED", "ASSIGNED", "IN PROGRESS", "RESOLVED"];

function getStepIndex(status) {
    const map = {
        pending: 0,
        filed: 0,
        verified: 1,
        assigned: 2,
        in_progress: 3,
        resolved: 4,
    };
    return map[status] ?? 0;
}

function StatusPill({ status }) {
    const styles = {
        pending:     "bg-amber-100 text-amber-700 border border-amber-300",
        filed:       "bg-amber-100 text-amber-700 border border-amber-300",
        verified:    "bg-blue-100 text-blue-700 border border-blue-300",
        assigned:    "bg-orange-100 text-orange-700 border border-orange-300",
        in_progress: "bg-blue-100 text-blue-700 border border-blue-300",
        resolved:    "bg-emerald-100 text-emerald-700 border border-emerald-300",
    };
    const label = (status || "pending").replace(/_/g, " ").toUpperCase();
    return (
        <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || styles.pending}`}>
            {label}
        </span>
    );
}

function SeverityBadge({ level }) {
    const styles = {
        low:      "text-green-700",
        medium:   "text-yellow-700",
        high:     "text-orange-600 font-bold",
        critical: "text-red-700 font-bold",
    };
    return (
        <span className={`text-sm ${styles[level] || "text-slate-600"}`}>
            ⚠ Severity: <span className="capitalize">{level || "Unknown"}</span>
        </span>
    );
}

function ProgressBar({ status }) {
    const currentStep = getStepIndex(status);
    return (
        <div className="mt-4">
            <div className="relative flex items-center justify-between">
                {/* Track line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0" />
                {/* Filled line */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-500 z-0 transition-all duration-700"
                    style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />

                {STATUS_STEPS.map((_, idx) => {
                    const done = idx < currentStep;
                    const active = idx === currentStep;
                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-1">
                            <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                    ${done ? "bg-teal-500 border-teal-500" : active ? "bg-white border-orange-400 ring-2 ring-orange-300 ring-offset-1" : "bg-white border-slate-300"}
                                `}
                            >
                                {done && <div className="w-2 h-2 rounded-full bg-white" />}
                                {active && <div className="w-2 h-2 rounded-full bg-orange-400" />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2">
                {STATUS_LABELS.map((label, idx) => {
                    const done = idx < currentStep;
                    const active = idx === currentStep;
                    return (
                        <span
                            key={idx}
                            className={`text-[10px] font-semibold tracking-tight uppercase
                                ${done ? "text-teal-600" : active ? "text-orange-500" : "text-slate-400"}
                            `}
                            style={{ minWidth: 0, textAlign: "center" }}
                        >
                            {label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function ComplaintCard({ complaint }) {
    const slaStatus = getSLAStatus(complaint);

    const locationText = complaint.locationText
        || (complaint.location?.coordinates
            ? `${complaint.location.coordinates[1].toFixed(4)}, ${complaint.location.coordinates[0].toFixed(4)}`
            : "Location unavailable");

    const shortId = `CL-${String(complaint._id || "").slice(-8).toUpperCase()}`;
    const filedTime = complaint.createdAt
        ? new Date(complaint.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " today"
        : "";

    return (
        <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border border-slate-100 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
                {/* Top Row: Status • ID • ETR • Time */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusPill status={complaint.status || "pending"} />
                    <span className="text-xs font-mono text-slate-500">{shortId}</span>
                    <div className="ml-auto flex flex-col items-end gap-0.5">
                        {slaStatus && (
                            <span className={`text-xs font-bold ${slaStatus.color}`}>
                                ETR: {slaStatus.text}
                            </span>
                        )}
                        {filedTime && (
                            <span className="text-xs text-slate-400">Filed {filedTime}</span>
                        )}
                    </div>
                </div>

                {/* Main Title */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-slate-800 flex-shrink-0" />
                    <h3 className="text-base font-bold text-slate-800 capitalize">
                        {complaint.category || "Issue"} — {complaint.department || "Government Dept."}
                    </h3>
                </div>

                {/* Details Row */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        {locationText}
                    </span>
                    <SeverityBadge level={complaint.riskLevel} />
                    {complaint.department && (
                        <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Assigned: {complaint.department}
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                <ProgressBar status={complaint.status} />
            </CardContent>
        </Card>
    );
}

function getSLAStatus(complaint) {
    if (!complaint.slaDeadline) return null;
    if (complaint.status === "resolved") return { text: "Met", color: "text-green-600" };

    const deadline = new Date(complaint.slaDeadline);
    const now = new Date();
    const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

    if (now > deadline) return { text: "Breached", color: "text-red-600" };
    if (hoursRemaining < 2) return { text: `${Math.round(hoursRemaining)}h left`, color: "text-red-600" };
    if (hoursRemaining < 6) return { text: `${Math.round(hoursRemaining)}h left`, color: "text-amber-600" };
    return { text: `${Math.round(hoursRemaining)}h left`, color: "text-green-600" };
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TrackComplaint() {
    const [complaints, setComplaints] = useState([]);
    const [emergencies, setEmergencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("complaints");
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    const socketRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        fetchComplaints();
        fetchEmergencies();
        connectToSocket();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const connectToSocket = () => {
        const socket = io("http://localhost:5000");
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("subscribe_emergency_alerts");
        });

        socket.on("EMERGENCY_STATUS_UPDATE", (data) => {
            setEmergencies((prev) =>
                prev.map((e) => (e._id === data.emergencyId ? { ...e, status: data.status } : e))
            );
        });

        socket.on("NEW_SOS_ALERT", (alertData) => {
            const newEmergency = {
                _id: alertData.complaintId,
                category: alertData.category,
                emergencyType: alertData.emergencyType,
                riskAssessment: { severity: alertData.riskLevel },
                location: { coordinates: alertData.location?.coordinates || [0, 0] },
                createdAt: alertData.timestamp || new Date(),
                slaDeadline: alertData.slaDeadline,
                slaDuration: alertData.slaDuration,
                status: "pending",
                isNew: true,
            };
            setEmergencies((prev) => [newEmergency, ...prev]);
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
            }
        });
    };

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res = await axios.get("http://localhost:5000/api/complaints?sortBy=priority&view=public");
            if (res.data.success) setComplaints(res.data.data);
        } catch (error) {
            console.error("Failed to fetch complaints", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmergencies = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/emergencies");
            if (res.data.success) setEmergencies(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch emergencies", error);
        }
    };

    const playAlertSound = () => {
        const audio = audioRef.current;
        if (audio) {
            audio.volume = 1.0;
            audio.currentTime = 0;
            audio.play().then(() => setAudioUnlocked(true)).catch(() => setAudioUnlocked(false));
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending:     "bg-amber-100 text-amber-700 border-amber-300",
            in_progress: "bg-blue-100 text-blue-700 border-blue-300",
            dispatched:  "bg-blue-100 text-blue-700 border-blue-300",
            on_site:     "bg-teal-100 text-teal-700 border-teal-300",
            resolved:    "bg-emerald-100 text-emerald-700 border-emerald-300",
        };
        return colors[status] || colors.pending;
    };

    const pendingEmergencies = emergencies.filter((e) => e.status !== "resolved").length;

    // First complaint with a real ID for the banner
    const trackedComplaint = complaints[0];
    const trackedId = trackedComplaint
        ? `CL-${String(trackedComplaint._id).slice(-8).toUpperCase()}`
        : null;

    return (
        <div className="page-wrapper">
            <div className="page-container page-section space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Track Complaints</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">Real-time status of your filed reports</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={playAlertSound}
                            className={audioUnlocked ? "text-green-600 border-green-200" : "text-slate-500"}
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            {audioUnlocked ? "Alerts On" : "Enable Alerts"}
                        </Button>
                        <Button
                            onClick={() => { fetchComplaints(); fetchEmergencies(); }}
                            variant="outline"
                            size="sm"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                            <Link to="/">← Back</Link>
                        </Button>
                    </div>
                </div>

                {/* Active Tracking Banner */}
                {trackedId && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                        <span className="text-green-800">
                            ✓ Your complaint{" "}
                            <span className="font-semibold font-mono text-teal-700">{trackedId}</span>{" "}
                            is active and being tracked in real-time
                        </span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveTab("complaints")}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border
                            ${activeTab === "complaints"
                                ? "bg-teal-600 text-white border-teal-600 shadow"
                                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}
                    >
                        Complaints ({complaints.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("emergencies")}
                        className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors border
                            ${activeTab === "emergencies"
                                ? "bg-red-600 text-white border-red-600 shadow"
                                : "bg-white text-slate-600 border-slate-200 hover:border-red-300"}`}
                    >
                        🚨 Emergency Reports ({emergencies.length})
                        {pendingEmergencies > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse shadow">
                                {pendingEmergencies}
                            </span>
                        )}
                    </button>
                </div>

                <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

                {/* === Complaints Tab === */}
                {activeTab === "complaints" && (
                    <>
                        {/* Stat Cards */}
                        {!loading && complaints.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "Filed",       value: complaints.length,                                                        color: "text-slate-800" },
                                    { label: "In Progress", value: complaints.filter((c) => c.status === "in_progress").length,               color: "text-blue-600" },
                                    { label: "Resolved",    value: complaints.filter((c) => c.status === "resolved").length,                  color: "text-green-600" },
                                    { label: "Pending",     value: complaints.filter((c) => !c.status || c.status === "pending").length,       color: "text-orange-500" },
                                ].map(({ label, value, color }) => (
                                    <Card key={label} className="bg-white border border-slate-100 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Complaint Cards */}
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-[160px] w-full rounded-2xl" />
                                <Skeleton className="h-[160px] w-full rounded-2xl" />
                            </div>
                        ) : complaints.length === 0 ? (
                            <Card className="bg-white border-0 shadow">
                                <CardContent className="p-12 text-center">
                                    <p className="text-slate-400">No complaints registered yet.</p>
                                    <Button asChild className="mt-4 bg-teal-600 hover:bg-teal-700">
                                        <Link to="/register">Register First Complaint</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {complaints.map((complaint) => (
                                    <ComplaintCard key={complaint._id} complaint={complaint} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* === Emergencies Tab === */}
                {activeTab === "emergencies" && (
                    <>
                        {!loading && emergencies.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: "Total",      value: emergencies.length,                                                                              color: "text-red-600" },
                                    { label: "Pending",    value: emergencies.filter((e) => e.status === "pending").length,                                        color: "text-amber-600" },
                                    { label: "Responding", value: emergencies.filter((e) => e.status === "dispatched" || e.status === "on_site").length,           color: "text-blue-600" },
                                    { label: "Resolved",   value: emergencies.filter((e) => e.status === "resolved").length,                                       color: "text-green-600" },
                                ].map(({ label, value, color }) => (
                                    <Card key={label} className="bg-white border border-slate-100 shadow-sm rounded-xl">
                                        <CardContent className="p-4">
                                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {emergencies.length === 0 ? (
                            <Card className="bg-red-50 border border-red-100 shadow-sm rounded-2xl">
                                <CardContent className="p-12 text-center">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-200" />
                                    <p className="text-slate-400">No emergency reports yet.</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Emergency SOS alerts will appear here with live status updates.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {emergencies.map((emergency) => {
                                    const slaDeadline = emergency.slaDeadline;
                                    const minutesRemaining = slaDeadline
                                        ? (new Date(slaDeadline) - new Date()) / 60000
                                        : null;
                                    const slaText = !slaDeadline
                                        ? null
                                        : emergency.status === "resolved"
                                        ? { text: "Met ✅", color: "text-green-600" }
                                        : minutesRemaining < 0
                                        ? { text: "BREACHED 🚨", color: "text-red-600" }
                                        : { text: `${Math.round(minutesRemaining)}m left`, color: minutesRemaining < 5 ? "text-red-600" : "text-amber-600" };

                                    return (
                                        <Card
                                            key={emergency._id}
                                            className={`border rounded-2xl shadow-md transition
                                                ${emergency.isNew ? "border-2 border-red-500" : ""}
                                                ${emergency.status === "pending" ? "bg-red-50 border-red-200" : ""}
                                                ${emergency.status === "dispatched" ? "bg-blue-50 border-blue-200" : ""}
                                                ${emergency.status === "on_site" ? "bg-teal-50 border-teal-200" : ""}
                                                ${emergency.status === "resolved" ? "bg-emerald-50 border-emerald-200" : ""}
                                            `}
                                        >
                                            <CardContent className="p-5 flex gap-4 items-start">
                                                <div className="text-4xl flex-shrink-0 mt-1">
                                                    {emergency.status === "pending" && "🚨"}
                                                    {emergency.status === "dispatched" && "🚔"}
                                                    {emergency.status === "on_site" && "👮"}
                                                    {emergency.status === "resolved" && "✅"}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <h3 className="font-bold text-base capitalize">
                                                                {emergency.isNew && <span className="text-red-600 mr-1 animate-pulse">🔴 NEW —</span>}
                                                                {emergency.emergencyType?.replace(/_/g, " ") || emergency.category || "Emergency"}
                                                            </h3>
                                                            <p className="text-xs text-slate-400">ID: {String(emergency._id || "").slice(-8)}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusColor(emergency.status)}`}>
                                                            {(emergency.status || "pending").replace(/_/g, " ").toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                                                        {emergency.location?.coordinates && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {emergency.location.coordinates[1]?.toFixed(4)},{" "}
                                                                {emergency.location.coordinates[0]?.toFixed(4)}
                                                            </span>
                                                        )}
                                                        {slaText && (
                                                            <span className={`flex items-center gap-1 font-semibold ${slaText.color}`}>
                                                                <Clock className="w-3.5 h-3.5" />
                                                                ETR: {slaText.text}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                                                            Target: {emergency.slaDuration || 15} min
                                                        </span>
                                                    </div>
                                                    {/* Emergency status steps */}
                                                    <div className="flex items-center gap-1 mt-1 pt-2">
                                                        {["Reported", "Dispatched", "On Site", "Resolved"].map((label, idx) => {
                                                            const stepMap = { 0: "pending", 1: "dispatched", 2: "on_site", 3: "resolved" };
                                                            const currentIdx = { pending: 0, dispatched: 1, on_site: 2, resolved: 3 }[emergency.status] ?? 0;
                                                            const done = idx <= currentIdx;
                                                            return (
                                                                <div key={label} className="flex items-center">
                                                                    <div className={`w-2 h-2 rounded-full ${done ? "bg-teal-500" : "bg-slate-200"}`} />
                                                                    {idx < 3 && <div className={`w-6 h-0.5 ${done && idx < currentIdx ? "bg-teal-500" : "bg-slate-200"}`} />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

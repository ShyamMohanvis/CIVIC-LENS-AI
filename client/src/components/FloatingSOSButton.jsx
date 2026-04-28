import { useState, useRef, useEffect } from "react";
import { X, Loader2, MapPin, CheckCircle, Clock, Phone, AlertTriangle, Mic, MicOff } from "lucide-react";
import axios from "axios";
import io from "socket.io-client";
import { createPortal } from "react-dom";

// ─── Helper ──────────────────────────────────────────────────────────────────
const MOCK_RESPONDER = { name: "Central Police Station", distance: "1.2 km", eta: "~4 min" };

function mapCategoryToEmergencyType(category) {
    const map = { electricity: "electrical_hazard", water: "flooding", road: "road_collapse", other: "other_emergency" };
    return map[category] || "other_emergency";
}

// ─── Floating SOS Button ─────────────────────────────────────────────────────
export default function FloatingSOSButton() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                aria-label="Emergency SOS"
                className="fixed bottom-6 right-6 z-50 group"
            >
                <span className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" />
                <span className="relative w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/40 flex items-center justify-center transition-transform hover:scale-110">
                    <span className="text-white font-black text-sm tracking-widest">SOS</span>
                </span>
                <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                    Emergency Alert
                </span>
            </button>
            {isOpen && <SOSModal onClose={() => setIsOpen(false)} />}
        </>
    );
}

// ─── SOS Modal ───────────────────────────────────────────────────────────────
// Steps: 'confirm' → 'listening' → 'processing' → 'confirm' (with analysis)
//                ↘ skip voice ↗
//        'confirm' → 'countdown' → 'submitting' → 'success'
function SOSModal({ onClose }) {
    const [step, setStep] = useState("confirm");
    const [understood, setUnderstood] = useState(false);
    const [location, setLocation] = useState(null);
    const [transcript, setTranscript] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [emergencyId, setEmergencyId] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [verificationCode, setVerificationCode] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    const recognitionRef = useRef(null);
    const listenTimeoutRef = useRef(null);
    const countdownRef = useRef(null);
    const socketRef = useRef(null);
    const emergencyIdRef = useRef(null);

    // Location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
                () => setLocation({ lat: 28.6139, lng: 77.209 })
            );
        } else {
            setLocation({ lat: 28.6139, lng: 77.209 });
        }

        // Speech recognition
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            const rec = new SR();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = "en-IN";
            rec.onresult = (e) => {
                let final = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
                }
                if (final) setTranscript((prev) => prev + final);
            };
            rec.onerror = () => stopListening();
            recognitionRef.current = rec;
        }

        // Socket
        const socket = io("http://localhost:5000");
        socketRef.current = socket;
        socket.on("EMERGENCY_ACKNOWLEDGED", (data) => {
            setAcknowledged(true);
            if (data.verificationCode) setVerificationCode(data.verificationCode);
            setTimeRemaining(15 * 60);
        });
        socket.on("EMERGENCY_RESOLVED", () => setTimeRemaining(null));

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            clearListenTimeout();
            clearCountdown();
            socket.disconnect();
        };
    }, []);

    // SLA timer
    useEffect(() => {
        if (!timeRemaining || timeRemaining <= 0) return;
        const id = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(id);
                    if (socketRef.current && emergencyIdRef.current) {
                        socketRef.current.emit("ESCALATE_EMERGENCY", { emergencyId: emergencyIdRef.current, timestamp: new Date() });
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [timeRemaining]);

    const clearListenTimeout = () => { if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current); };
    const clearCountdown = () => { if (countdownRef.current) clearInterval(countdownRef.current); };

    // ── Voice helpers ──────────────────────────────────────────────────────
    const startListening = () => {
        if (!recognitionRef.current) return;
        setTranscript("");
        setIsListening(true);
        setStep("listening");
        try {
            recognitionRef.current.start();
            listenTimeoutRef.current = setTimeout(() => stopListening(), 12000);
        } catch (_) { setStep("confirm"); }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) recognitionRef.current.stop();
        setIsListening(false);
        clearListenTimeout();
        // If we have speech, analyze it
        if (transcript.trim()) {
            analyzeVoice();
        } else {
            setStep("confirm");
        }
    };

    const analyzeVoice = async () => {
        setStep("processing");
        try {
            const res = await axios.post("http://localhost:5000/api/complaints/voice/analyze", {
                transcript: transcript.trim(),
                location,
            });
            if (res.data.success) {
                setAnalysis(res.data.analysis);
            }
        } catch (_) {}
        setStep("confirm"); // return to confirm with (or without) analysis
    };

    // ── Submit flow ────────────────────────────────────────────────────────
    const handleSubmit = () => {
        if (!understood) return;
        setStep("countdown");
        setCountdown(5);
        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearCountdown();
                    fireEmergency();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleAbort = () => {
        clearCountdown();
        setStep("confirm");
        setCountdown(5);
    };

    const fireEmergency = async () => {
        setStep("submitting");
        try {
            const res = await axios.post("http://localhost:5000/api/emergencies", {
                lat: location?.lat ?? 28.6139,
                lng: location?.lng ?? 77.209,
                emergencyType: analysis ? mapCategoryToEmergencyType(analysis.category) : "other_emergency",
                reportedBy: { userId: "anonymous", isOnSite: true },
            });
            if (res.data.success) {
                const id = res.data.data._id;
                setEmergencyId(id);
                emergencyIdRef.current = id;
                setStep("success");
            }
        } catch (err) {
            console.error("SOS submission failed:", err);
            setStep("confirm");
        }
    };

    const closePanel = () => {
        clearCountdown();
        clearListenTimeout();
        if (recognitionRef.current && isListening) recognitionRef.current.stop();
        onClose();
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={step === "countdown" || step === "listening" ? undefined : closePanel}
            />

            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up sm:animate-none">

                {/* ── Warm Red Header ── */}
                <div className="bg-gradient-to-r from-red-800 to-red-600 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <AlertTriangle className="w-7 h-7 text-white" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-lg tracking-wide leading-tight">EMERGENCY SOS</h2>
                            <p className="text-red-200 text-xs font-medium">Life-threatening situations only</p>
                        </div>
                    </div>
                    {step !== "countdown" && step !== "listening" && (
                        <button onClick={closePanel} className="p-1.5 rounded-full bg-red-700/50 hover:bg-red-700 transition-colors" aria-label="Close">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="p-6 space-y-5">

                    {/* STEP: Confirm */}
                    {step === "confirm" && (
                        <>
                            {/* Warning */}
                            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-red-700">Use only in life-threatening emergencies</p>
                                    <p className="text-xs text-red-600 mt-0.5">Misuse delays help for people in real danger.</p>
                                </div>
                            </div>

                            {/* Context Info */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="text-slate-400 text-xs block">Your location</span>
                                        <span className="font-semibold text-slate-700 text-sm">
                                            {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Detecting…"}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                    <div>
                                        <span className="text-slate-400 text-xs block">Nearest responder</span>
                                        <span className="font-semibold text-slate-700 text-sm">
                                            {MOCK_RESPONDER.name} · {MOCK_RESPONDER.distance} · ETA {MOCK_RESPONDER.eta}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Voice analysis result (if captured) */}
                            {analysis && (
                                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm space-y-1">
                                    <p className="font-bold text-blue-700 text-xs uppercase tracking-wide">🎙 Voice Analysis</p>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Issue detected</span>
                                        <span className="font-semibold capitalize text-slate-800">{analysis.category}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Risk assessed</span>
                                        <span className="font-bold text-red-600 capitalize">{analysis.riskLevel}</span>
                                    </div>
                                </div>
                            )}

                            {/* Voice Button */}
                            {recognitionRef.current && (
                                <button
                                    onClick={startListening}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 text-sm font-semibold hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                    <Mic className="w-4 h-4" />
                                    {analysis ? "Re-describe by Voice" : "Describe Emergency by Voice (optional)"}
                                </button>
                            )}

                            {/* Mandatory Checkbox */}
                            <label className="flex items-start gap-3 cursor-pointer select-none group">
                                <div className="relative mt-0.5 flex-shrink-0">
                                    <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="sr-only" />
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${understood ? "bg-red-600 border-red-600" : "bg-white border-slate-300 group-hover:border-red-400"}`}>
                                        {understood && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 10">
                                                <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-slate-700 leading-snug">
                                    I understand this is a <strong className="text-red-700">life-threatening emergency</strong> and need immediate assistance.
                                </span>
                            </label>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!understood}
                                className={`w-full py-3.5 rounded-xl text-base font-bold tracking-wide transition-all ${understood ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 active:scale-[.98]" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                            >
                                Submit Emergency Alert
                            </button>
                            <button onClick={closePanel} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition font-medium">
                                Cancel
                            </button>
                        </>
                    )}

                    {/* STEP: Listening */}
                    {step === "listening" && (
                        <div className="flex flex-col items-center gap-6 py-4 text-center">
                            <div className="relative w-28 h-28">
                                <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
                                <div className="relative w-28 h-28 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/40">
                                    <Mic className="w-12 h-12 text-white" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xl font-black text-red-600 animate-pulse">Listening…</p>
                                <p className="text-sm text-slate-500 mt-1">Describe the emergency clearly</p>
                            </div>
                            {transcript && (
                                <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 text-left italic max-h-24 overflow-y-auto">
                                    "{transcript}"
                                </div>
                            )}
                            <button
                                onClick={stopListening}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-sm hover:border-red-400 hover:text-red-600 transition"
                            >
                                <MicOff className="w-4 h-4" /> Stop Recording
                            </button>
                        </div>
                    )}

                    {/* STEP: Processing */}
                    {step === "processing" && (
                        <div className="flex flex-col items-center gap-4 py-10 text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-red-600" />
                            <p className="text-base font-semibold text-slate-700">🧠 Analysing your description…</p>
                        </div>
                    )}

                    {/* STEP: Countdown */}
                    {step === "countdown" && (
                        <div className="flex flex-col items-center gap-6 py-4">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="#fee2e2" strokeWidth="8" />
                                    <circle
                                        cx="60" cy="60" r="52" fill="none"
                                        stroke="#dc2626" strokeWidth="8"
                                        strokeDasharray={`${2 * Math.PI * 52}`}
                                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - countdown / 5)}`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-red-600">{countdown}</span>
                                    <span className="text-xs text-slate-400 font-medium">seconds</span>
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="font-bold text-slate-800">Alert firing in {countdown}s…</p>
                                <p className="text-sm text-slate-500">Your location will be sent to responders.</p>
                            </div>
                            <button
                                onClick={handleAbort}
                                className="w-full py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-bold text-sm hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                                ✕ Abort — Cancel Alert
                            </button>
                        </div>
                    )}

                    {/* STEP: Submitting */}
                    {step === "submitting" && (
                        <div className="flex flex-col items-center gap-4 py-10">
                            <Loader2 className="w-12 h-12 animate-spin text-red-600" />
                            <p className="text-base font-semibold text-slate-700">Sending emergency alert…</p>
                        </div>
                    )}

                    {/* STEP: Success */}
                    {step === "success" && (
                        <div className="space-y-5 text-center py-2">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-9 h-9 text-green-600" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xl font-bold text-green-700">Emergency Alert Sent</p>
                                <p className="text-sm text-slate-500 mt-1">Authorities notified. Move to a safe location.</p>
                            </div>

                            {acknowledged ? (
                                <div className="px-4 py-3 bg-green-50 border-2 border-green-400 rounded-xl">
                                    <p className="font-bold text-green-700 text-sm">✅ Acknowledged by Command Centre</p>
                                    <p className="text-xs text-green-600 mt-0.5">Help is on the way!</p>
                                    {verificationCode && (
                                        <div className="mt-3 p-2 bg-white rounded-lg border border-green-200">
                                            <p className="text-xs text-slate-400 uppercase font-semibold">Verification Code</p>
                                            <p className="text-2xl font-mono font-black text-slate-800 tracking-widest mt-1">{verificationCode}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Share with the operator</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                                    <span className="font-semibold text-amber-700">Awaiting Command Centre response…</span>
                                </div>
                            )}

                            {timeRemaining !== null && timeRemaining > 0 && (
                                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Response ETA</p>
                                    <p className="text-3xl font-mono font-bold text-blue-600">{formatTime(timeRemaining)}</p>
                                </div>
                            )}

                            <a href="tel:100" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                                <Phone className="w-4 h-4" /> Call Emergency Services (100)
                            </a>
                            <button onClick={closePanel} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition">
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

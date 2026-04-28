import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, AlertCircle, CheckCircle, Shield, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import axios from "axios";
// Navbar removed

export default function VoiceReport() {
    const navigate = useNavigate();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [location, setLocation] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const recognitionRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-IN'; // Indian English

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError('Could not understand. Please try again.');
                stopListening();
            };
        }

        // Get location
        fetchLocation();

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const fetchLocation = () => {
        // Mock location for demo
        setTimeout(() => {
            setLocation({
                lat: 28.6139,
                lng: 77.2090
            });
        }, 500);
    };

    const startListening = () => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported in this browser');
            return;
        }

        setTranscript("");
        setAnalysis(null);
        setError(null);
        setIsListening(true);

        try {
            recognitionRef.current.start();

            // Auto-stop after 15 seconds
            timeoutRef.current = setTimeout(() => {
                stopListening();
            }, 15000);
        } catch (err) {
            console.error('Error starting recognition:', err);
            setError('Could not start voice recognition');
            setIsListening(false);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setIsListening(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Analyze if we have transcript
        if (transcript.trim()) {
            analyzeIncident();
        }
    };

    const analyzeIncident = async () => {
        setAnalyzing(true);
        setError(null);

        try {
            // Call AI analysis API
            const response = await axios.post('http://localhost:5000/api/complaints/voice/analyze', {
                transcript: transcript.trim(),
                location
            });

            if (response.data.success) {
                setAnalysis(response.data.analysis);
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError('Could not analyze the incident. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = async () => {
        if (!analysis || !location) return;

        setSubmitting(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:5000/api/complaints/voice', {
                transcript: transcript.trim(),
                analysis,
                lat: location.lat,
                lng: location.lng
            });

            if (response.data.success) {
                // Show success and redirect
                setTimeout(() => {
                    navigate('/track');
                }, 2000);
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to submit complaint. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getRiskColor = (level) => {
        const colors = {
            low: "text-green-600",
            medium: "text-yellow-600",
            high: "text-orange-600",
            critical: "text-red-600"
        };
        return colors[level] || colors.low;
    };

    return (
        <div className="page-wrapper">
            <div className="page-container-md page-section space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                        <Link to="/">← Back</Link>
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mic className="w-4 h-4" />
                        <span>Voice-First Reporting</span>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                        Voice Report
                    </h1>
                    <p className="text-slate-500 mt-2">Speak to report - AI will understand</p>
                </div>

                {/* Voice Input Card */}
                <Card className="bg-white shadow-xl hover:shadow-2xl transition border-0">
                    <CardContent className="p-8">
                        <div className="text-center space-y-6">
                            {/* Microphone Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={analyzing || submitting}
                                    className={`w-32 h-32 rounded-full flex items-center justify-center transition shadow-2xl ${isListening
                                        ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse scale-110'
                                        : 'bg-gradient-to-br from-teal-500 to-emerald-600 hover:scale-105 hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.5)]'
                                        } ${(analyzing || submitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isListening ? (
                                        <MicOff className="w-16 h-16 text-white" />
                                    ) : (
                                        <Mic className="w-16 h-16 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Status Text */}
                            <div className="space-y-2">
                                {isListening && (
                                    <div className="space-y-1">
                                        <p className="text-lg font-semibold text-teal-600 animate-pulse">
                                            🎙️ Listening...
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Describe the problem around you
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Auto-stops in 15 seconds
                                        </p>
                                    </div>
                                )}

                                {!isListening && !transcript && !analyzing && (
                                    <div className="space-y-1">
                                        <p className="text-lg font-semibold text-slate-800">Tap to Start</p>
                                        <p className="text-sm text-slate-500">
                                            Speak clearly about the civic issue
                                        </p>
                                    </div>
                                )}

                                {analyzing && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                                        <p className="text-lg font-semibold text-teal-600">
                                            AI Analyzing...
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Transcript (hidden from user, shown for demo) */}
                            {transcript && !isListening && (
                                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                                    <p className="text-xs text-slate-500 mb-1">Captured (for demo only):</p>
                                    <p className="text-sm text-slate-700 italic">&quot;{transcript}&quot;</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* AI Analysis Result */}
                {analysis && (
                    <Card className="bg-white shadow-xl hover:-translate-y-1 transition border-0">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                <h3 className="font-bold text-lg text-slate-800">Voice Complaint Detected</h3>
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                                    <span className="text-sm font-medium">Issue</span>
                                    <span className="text-sm font-bold capitalize">{analysis.category}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                                    <span className="text-sm font-medium">Department</span>
                                    <span className="text-sm font-bold">{analysis.department}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-sm font-medium">Risk Level</span>
                                    </div>
                                    <span className={`text-sm font-bold capitalize ${getRiskColor(analysis.riskLevel)}`}>
                                        {analysis.riskLevel === 'high' && '🔴'} {analysis.riskLevel}
                                    </span>
                                </div>

                                {analysis.isEmergency && (
                                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                            <span className="text-sm font-medium text-red-900">Emergency</span>
                                        </div>
                                        <span className="text-sm font-bold text-red-600">✅ Yes</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-medium">AI Confidence</span>
                                    </div>
                                    <span className="text-sm font-bold">{(analysis.confidence * 100).toFixed(0)}%</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-sm font-medium">Expected Action Time</span>
                                    </div>
                                    <span className="text-sm font-bold">{analysis.expectedSLA || '24 hours'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-900">Error</p>
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Info Box */}
                {!analysis && !isListening && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex gap-3 shadow-sm">
                        <AlertCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-teal-900">
                                Zero-Typing Voice Experience
                            </p>
                            <p className="text-xs text-teal-700">
                                AI will automatically detect category, risk level, and emergency status from your voice
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {analysis && (
                    <div className="flex gap-4">
                        <Button
                            size="lg"
                            className="flex-1 h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Submit Complaint
                                </>
                            )}
                        </Button>

                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-8 text-lg border-2"
                            onClick={() => {
                                setTranscript("");
                                setAnalysis(null);
                                setError(null);
                            }}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Browser Support Note */}
                {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-900 dark:text-yellow-100">
                            ⚠️ Voice recognition not supported in this browser. Please use Chrome or Edge.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

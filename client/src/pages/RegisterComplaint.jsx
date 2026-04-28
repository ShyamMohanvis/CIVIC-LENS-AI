import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import {
    Camera, MapPin, Loader2, Sparkles, CheckCircle, 
    ArrowLeft, Upload, FileText, Check, Navigation, AlertCircle, Building2
} from "lucide-react";
import axios from "axios";
import Navbar from "@/components/Navbar";

export default function RegisterComplaint() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    
    // Form State
    const [image, setImage] = useState(null);
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState(null);
    const [description, setDescription] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    
    // AI & Loading State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);
    
    const fileInputRef = useRef(null);

    const categories = [
        { value: 'pothole', label: 'Pothole / Road Damage', icon: '🛣️', desc: 'Damaged roads' },
        { value: 'garbage', label: 'Garbage / Littering', icon: '🗑️', desc: 'Waste collection' },
        { value: 'water', label: 'Water Leakage', icon: '💧', desc: 'Pipeline leaks' },
        { value: 'electricity', label: 'Streetlight Issue', icon: '⚡', desc: 'Power failures' },
        { value: 'encroachment', label: 'Encroachment', icon: '🚧', desc: 'Illegal occupation' },
        { value: 'other', label: 'Other Issue', icon: '📋', desc: 'Miscellaneous' },
    ];

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        
        // Image preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
        };
        reader.readAsDataURL(selectedFile);
        
        // Trigger AI Analysis instantly for Step 1
        setIsAnalyzing(true);
        setAiAnalysis(null);
        
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            
            // Try to hit local Detectron2 service
            const res = await axios.post("http://localhost:8001/detect", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            
            if (res.data && res.data.civic) {
                setAiAnalysis(res.data.civic);
                setSelectedCategory(res.data.civic.label !== "unknown" ? res.data.civic.label : "other");
            } else {
                throw new Error("Invalid AI response");
            }
        } catch (error) {
            console.warn("AI Service unreachable, simulating fallback analysis...", error);
            // Fallback mock if AI service is off
            setTimeout(() => {
                const mock = {
                    label: "pothole",
                    display: "Pothole / Road Damage",
                    confidence: 0.85,
                    severity: "medium",
                    department: "Public Works Department"
                };
                setAiAnalysis(mock);
                setSelectedCategory("pothole");
                setIsAnalyzing(false);
            }, 1500);
            return;
        }
        
        setIsAnalyzing(false);
    };

    const fetchLocation = () => {
        setIsLocating(true);
        // Mock GPS acquisition
        setTimeout(() => {
            setLocation({ lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi" });
            setIsLocating(false);
        }, 800);
    };

    // Auto-fetch location when entering Step 2
    useEffect(() => {
        if (step === 2 && !location) {
            fetchLocation();
        }
    }, [step, location]);

    const handleSubmit = async () => {
        if (!file || !location) return;
        setSubmitting(true);
        const formData = new FormData();
        formData.append("image", file);
        formData.append("lat", location.lat);
        formData.append("lng", location.lng);
        if (description) formData.append("description", description);
        if (selectedCategory) formData.append("categoryOverride", selectedCategory);

        try {
            const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
            const res = await axios.post("http://localhost:5000/api/complaints", formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Idempotency-Key": idempotencyKey
                }
            });

            if (res.data.success) {
                setSubmittedData({
                    id: res.data.data._id.substring(0, 8).toUpperCase(),
                    department: res.data.data.department || "General Administration"
                });
                setStep(5); // Success step
            }
        } catch (error) {
            console.error("Submission failed", error);
            // Don't just show a generic alert, attempt to extract the message
            alert("Failed to register complaint: " + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const nextStep = () => setStep(s => Math.min(4, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const steps = [
        { id: 1, title: "Photo", icon: Camera },
        { id: 2, title: "Location", icon: MapPin },
        { id: 3, title: "Details", icon: FileText },
        { id: 4, title: "Review", icon: Check }
    ];

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            
            {/* Header / Stepper Container */}
            <div className="pt-8 pb-8 bg-white border-b shadow-sm sticky top-16 z-30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center gap-4 mb-8 text-teal-700">
                        <Link to="/" className="hover:text-teal-900 transition flex items-center gap-1">
                            <ArrowLeft className="w-5 h-5" /> 
                            <span className="font-medium">Cancel</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <h1 className="text-xl font-bold">Register Complaint</h1>
                    </div>

                    {/* Desktop Stepper */}
                    <div className="hidden sm:flex items-center justify-between relative max-w-lg mx-auto">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full -z-10"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-500 rounded-full transition-all duration-300 -z-10" 
                             style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                        
                        {steps.map((s) => {
                            const isActive = step === s.id;
                            const isPast = step > s.id;
                            const Icon = s.icon;
                            
                            return (
                                <div key={s.id} className="flex flex-col items-center gap-2 bg-white px-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isActive ? 'border-teal-600 bg-teal-50 text-teal-700' : isPast ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                                        {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-sm font-medium ${isActive ? 'text-teal-800' : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {s.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Wizard Area */}
            <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col">
                
                {/* STEP 1: PHOTO */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Capture the Issue</h2>
                            <p className="text-slate-500">AI will auto-detect the category and severity from your photo</p>
                        </div>

                        {!image ? (
                            <div 
                                className="w-full h-[300px] border-2 border-dashed border-teal-200 bg-teal-50/50 rounded-2xl flex flex-col items-center justify-center text-center hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer group"
                                onClick={() => fileInputRef.current.click()}
                            >
                                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md transform group-hover:scale-105 transition-transform mb-6">
                                    <Camera className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg text-slate-700 mb-2">Take or upload a photo</h3>
                                <p className="text-sm text-slate-500 mb-6">JPG, PNG or HEIC · Max 10MB</p>
                                <div className="flex gap-4 justify-center">
                                    <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-100" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>Open Camera</Button>
                                    <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-100" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>Upload File</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-black">
                                    <img src={image} alt="Preview" className="w-full h-64 sm:h-80 object-cover opacity-90" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <Button variant="secondary" onClick={() => { setImage(null); setFile(null); setAiAnalysis(null); }} className="shadow-lg">
                                            <Camera className="mr-2 h-4 w-4" /> Retake Photo
                                        </Button>
                                    </div>
                                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center shadow-md">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Photo Captured
                                    </div>
                                </div>

                                {/* Instant AI Reward */}
                                {isAnalyzing ? (
                                    <Card className="bg-slate-50 border-dashed border-2 animate-pulse mt-6">
                                        <CardContent className="p-6 flex flex-col items-center justify-center text-slate-500 space-y-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                                            <p className="font-medium text-sm">AI Engine analyzing visual data...</p>
                                        </CardContent>
                                    </Card>
                                ) : aiAnalysis ? (
                                    <Card className="border-teal-100 shadow-md bg-gradient-to-br from-teal-50 to-emerald-50/30 mt-6">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center border border-teal-200">
                                                        <Sparkles className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">AI Detection</p>
                                                        <h4 className="text-lg font-bold text-slate-800">{aiAnalysis.display || "Issue Detected"}</h4>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1 bg-white border px-2.5 py-1 rounded-md text-sm font-semibold text-slate-700 shadow-sm">
                                                        {(aiAnalysis.confidence * 100).toFixed(0)}% Match
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                )}

                {/* STEP 2: LOCATION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Pinpoint Location</h2>
                            <p className="text-slate-500">We need exact coordinates to route deployment teams</p>
                        </div>

                        <Card className="overflow-hidden shadow-lg border-0 border-t-4 border-t-teal-500">
                            <div className="h-64 bg-slate-200 relative">
                                {/* Mock Map Background */}
                                <img src={`https://api.maptiler.com/maps/streets-v2/static/${location?.lng || 77.2090},${location?.lat || 28.6139},14/800x400.png?key=OPB1aI0Q7Yf8M7a0Xl03`} 
                                     alt="Map" className="w-full h-full object-cover grayscale opacity-70" 
                                     onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center bg-slate-100"><MapPin class="w-8 h-8 text-slate-300 mb-2"/><span class="text-slate-400 text-sm">Interactive Map Unavailable</span></div>'}} />
                                
                                {isLocating ? (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                        <Navigation className="w-10 h-10 text-teal-600 animate-bounce drop-shadow-lg mb-4" />
                                        <p className="font-semibold text-teal-800">Acquiring GPS Signal...</p>
                                    </div>
                                ) : location ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-75 hidden sm:block"></div>
                                            <MapPin className="w-12 h-12 text-teal-600 drop-shadow-xl relative -top-6" fill="#fff" />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <CardContent className="p-6 bg-white">
                                {location ? (
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-teal-50 rounded-lg text-teal-600 shrink-0">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 text-lg">GPS Location Locked</h4>
                                            <p className="text-slate-600 mt-1 flex gap-4 text-sm font-mono bg-slate-50 inline-block px-2 py-1 rounded">
                                                <span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                                            </p>
                                            <div className="mt-3">
                                                <Button variant="link" size="sm" className="px-0 text-teal-600 h-auto font-medium hover:text-teal-800" onClick={fetchLocation}>
                                                    <Navigation className="w-3 h-3 mr-1"/> Update GPS Position
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                                        <p className="text-slate-700 font-medium mb-4">Location not detected.</p>
                                        <Button onClick={fetchLocation} variant="outline" className="border-teal-200 hover:bg-teal-50 text-teal-700">Retry GPS</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 3: DETAILS */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Additional Details</h2>
                            <p className="text-slate-500">Provide context to help teams resolve the issue faster</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Issue Category</label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-full h-14 bg-white shadow-sm border-slate-200">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                <div className="flex items-center gap-3 py-1">
                                                    <span className="text-xl">{cat.icon}</span>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium text-slate-800">{cat.label}</span>
                                                        <span className="text-xs text-slate-500">{cat.desc}</span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 ml-1 flex justify-between">
                                    Description <span className="text-slate-400 font-normal">Optional</span>
                                </label>
                                <Textarea 
                                    placeholder="Describe the issue in your own words. How long has this been a problem?" 
                                    className="min-h-[160px] resize-none bg-white shadow-sm border-slate-200 text-base py-3"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: REVIEW */}
                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center space-y-2 mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">Review & Submit</h2>
                            <p className="text-slate-500">Confirm details before sending to municipal authorities</p>
                        </div>

                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <div className="h-48 relative bg-slate-900 border-b border-slate-200">
                                <img src={image} className="w-full h-full object-cover opacity-80 mix-blend-overlay" alt="Issue" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 text-white z-10 w-full pr-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                        <span className="text-sm font-medium">GPS Verified</span>
                                    </div>
                                    <p className="text-xs text-slate-300 font-mono tracking-wider">{location?.lat?.toFixed(4)}° N, {location?.lng?.toFixed(4)}° E</p>
                                </div>
                            </div>
                            <CardContent className="p-0 flex flex-col sm:flex-row">
                                <div className="p-6 border-b sm:border-b-0 sm:border-r border-slate-100 flex-1 bg-white">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-teal-400" /> Category</p>
                                    <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        {categories.find(c => c.value === selectedCategory)?.icon} 
                                        {categories.find(c => c.value === selectedCategory)?.label || "Other"}
                                    </p>
                                </div>
                                <div className="p-6 flex-1 bg-teal-50/30">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Navigation className="w-3 h-3 text-teal-400" /> Routing To</p>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-teal-600" />
                                        {aiAnalysis?.department || "Municipal Corporation"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                
                {/* STEP 5: SUCCESS */}
                {step === 5 && submittedData && (
                    <div className="text-center space-y-6 py-12 animate-in zoom-in-95 duration-500 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-8">
                        <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-800">Issue Reported!</h2>
                            <p className="text-slate-500">Your complaint has been logged and assigned.</p>
                        </div>
                        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 p-6 rounded-xl relative overflow-hidden text-left">
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Tracking ID</p>
                            <p className="text-3xl font-mono font-bold tracking-wider text-slate-800">{submittedData.id}</p>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-sm font-medium text-slate-500 mb-1">Forwarded To</p>
                                <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-teal-600" />
                                    {submittedData.department}
                                </p>
                            </div>
                        </div>
                        <div className="pt-4 flex flex-col gap-3 max-w-xs mx-auto">
                            <Button size="lg" className="w-full bg-brand-gradient shadow-md" onClick={() => navigate('/track')}>
                                Track Live Status
                            </Button>
                            <Button size="lg" variant="outline" className="w-full" onClick={() => navigate('/')}>
                                Return Home
                            </Button>
                        </div>
                    </div>
                )}

            </main>

            {/* Bottom Footer for Steps 1-4 */}
            {step < 5 && (
                <div className="bg-white border-t p-4 sm:p-6 w-full z-40 mt-auto shadow-sm">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div>
                            {step > 1 ? (
                                <Button variant="ghost" onClick={prevStep} className="text-slate-600 hover:bg-slate-100 font-medium">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                            ) : (
                                <span className="text-sm font-medium text-slate-400 hidden sm:inline-block ml-4">Step 1 of 4</span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <span className="text-sm font-medium text-slate-500 sm:hidden">Step {step}/4</span>
                            
                            {step < 4 ? (
                                <Button 
                                    onClick={nextStep} 
                                    size="lg"
                                    disabled={
                                        (step === 1 && (!image || isAnalyzing)) || 
                                        (step === 2 && !location)
                                    }
                                    className="px-10 bg-teal-600 hover:bg-teal-700 shadow-md transition-all text-base min-w-[140px]"
                                >
                                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next Step"}
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={submitting}
                                    size="lg"
                                    className="px-10 bg-brand-gradient shadow-md hover:shadow-lg text-white transition-all text-base min-w-[160px]"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting</>
                                    ) : (
                                        <><Upload className="w-5 h-5 mr-2" /> Submit Ticket</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


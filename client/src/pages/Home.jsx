import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import {
    Camera,
    MapPin,
    Shield,
    Sparkles,
    TrendingUp,
    Zap,
    Award,
    BarChart3,
    Mic,
    AlertTriangle,
    Search,
    Users,
    Building2,
    CheckCircle,
    ArrowRight,
    Phone,
    Mail,
    Clock,
    FileText,
    Droplets,
    Lightbulb,
    Trash2,
    Wrench,
    HelpCircle,
    Play
} from "lucide-react";
import Navbar from "@/components/Navbar";
import HeatMap from "@/components/analytics/HeatMap";

export default function Home() {
    const [sosTimerActive, setSosTimerActive] = useState(false);
    const [sosTimeLeft, setSosTimeLeft] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            console.log('✅ Connected to homepage socket');
        });

        socket.on('START_SOS_TIMER', (data) => {
            console.log('⏳ Starting SOS timer on homepage:', data);
            setSosTimerActive(true);
            setSosTimeLeft(15); // 15 seconds
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        let interval;
        if (sosTimerActive && sosTimeLeft > 0) {
            interval = setInterval(() => {
                setSosTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (sosTimeLeft === 0) {
            setSosTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [sosTimerActive, sosTimeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const services = [
        { icon: FileText, title: "Road Issues", desc: "Potholes, damaged roads, traffic signals", color: "from-orange-500 to-red-500" },
        { icon: Droplets, title: "Water Supply", desc: "Leakage, contamination, shortage", color: "from-blue-500 to-cyan-500" },
        { icon: Lightbulb, title: "Electricity", desc: "Street lights, power failures", color: "from-yellow-500 to-orange-500" },
        { icon: Trash2, title: "Garbage", desc: "Waste collection, dumping sites", color: "from-green-500 to-emerald-500" },
        { icon: Wrench, title: "Sanitation", desc: "Drainage, sewage, cleanliness", color: "from-teal-500 to-pink-500" },
        { icon: HelpCircle, title: "Other Issues", desc: "Any other civic problems", color: "from-slate-500 to-gray-600" },
    ];

    const stats = [
        { value: "1,234+", label: "Complaints Registered", icon: FileText },
        { value: "987+", label: "Issues Resolved", icon: CheckCircle },
        { value: "25+", label: "Districts Covered", icon: Building2 },
        { value: "98%", label: "Citizen Satisfaction", icon: Users },
    ];

    const howItWorks = [
        { step: 1, title: "Capture Photo", desc: "Take a photo of the civic issue", icon: Camera, color: "bg-blue-500" },
        { step: 2, title: "AI Analysis", desc: "Our AI analyzes and categorizes", icon: Sparkles, color: "bg-teal-500" },
        { step: 3, title: "Auto Assignment", desc: "Sent to relevant department", icon: Building2, color: "bg-orange-500" },
        { step: 4, title: "Resolution", desc: "Track until resolved", icon: CheckCircle, color: "bg-green-500" },
    ];

    return (
        <div className="page-wrapper">
                {/* Hero Section */}
                <section className="relative bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-0 items-center justify-between">
                            
                            {/* Left Content (Dominant Asymmetric Box) */}
                            <div className="text-white lg:w-[65%] z-10 space-y-8 pr-0 lg:pr-16 relative">
                                <div className="absolute -left-8 -top-8 w-24 h-24 bg-teal-400/20 rounded-full blur-2xl"></div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight relative z-10">
                                    Making Cities
                                    <span className="block text-green-300 mt-2">Cleaner & Smarter</span>
                                </h1>

                                <div className="space-y-5 bg-white/5 backdrop-blur-sm p-6 lg:p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
                                    <p className="text-lg md:text-xl text-teal-50 leading-relaxed font-medium">
                                        Zero-typing AI-powered civic complaint platform with trust scoring,
                                        risk assessment, and intelligent municipal governance.
                                    </p>
                                    <div className="h-px w-20 bg-teal-400/50"></div>
                                    <p className="text-xl font-bold tracking-wide text-white flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-green-300" />
                                        One Photo. One Click. Real Civic Change.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2 relative z-10">
                                    <Button onClick={() => navigate("/register")} size="lg" className="h-14 px-8 bg-white text-teal-800 hover:bg-teal-50 hover:scale-105 transition-all shadow-xl font-bold rounded-xl text-base">
                                        <Camera className="mr-2 h-5 w-5" />
                                        Report Now
                                    </Button>
                                    <Button onClick={() => navigate("/track")} size="lg" variant="outline" className="h-14 px-8 border-2 border-white bg-transparent text-white hover:bg-white/15 hover:text-white transition-all font-bold rounded-xl text-base">
                                        <Search className="mr-2 h-5 w-5" />
                                        Track
                                    </Button>
                                    <Button onClick={() => navigate("/control-room")} size="lg" className="h-14 px-8 bg-gradient-to-r from-teal-500 to-cyan-500 border-none text-white hover:from-teal-400 hover:to-cyan-400 shadow-[0_0_30px_rgba(20,184,166,0.5)] font-bold rounded-xl transition-all hover:-translate-y-1 text-base">
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        AI Control Room
                                    </Button>
                                </div>
                            </div>

                            {/* Right Content (Recessed Asymmetric Cards) */}
                            <div className="w-full lg:w-[45%] flex flex-col gap-6 lg:-ml-10 xl:-ml-20 relative z-20 mt-12 lg:mt-0">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -z-10"></div>
                                
                                <Card className="bg-white/95 backdrop-blur-md shadow-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.02] border-0 rounded-3xl overflow-hidden self-end w-full sm:w-[85%]">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Camera className="w-24 h-24" />
                                    </div>
                                    <CardContent className="p-6 sm:p-8 flex items-center justify-between relative z-10">
                                        <div className="space-y-1">
                                            <h3 className="font-extrabold text-xl text-slate-800">Quick Report</h3>
                                            <p className="text-sm text-slate-500 font-medium">Snap & submit in seconds</p>
                                        </div>
                                        <button onClick={() => navigate("/register")} className="w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl flex items-center justify-center transition-colors shadow-lg shadow-teal-600/30 shrink-0">
                                            <ArrowRight className="w-6 h-6" />
                                        </button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/95 backdrop-blur-md shadow-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all hover:scale-[1.02] border-0 rounded-3xl overflow-hidden self-start w-full sm:w-[85%] lg:-ml-8">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Mic className="w-24 h-24 text-blue-800" />
                                    </div>
                                    <CardContent className="p-6 sm:p-8 flex items-center justify-between relative z-10">
                                        <div className="space-y-1">
                                            <h3 className="font-extrabold text-xl text-slate-800">Voice Report</h3>
                                            <p className="text-sm text-slate-500 font-medium">Speak your complaint</p>
                                        </div>
                                        <button onClick={() => navigate("/voice")} className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-colors shadow-lg shadow-blue-600/30 shrink-0">
                                            <Mic className="w-6 h-6" />
                                        </button>
                                    </CardContent>
                                </Card>

                                <Card className={`shadow-2xl transition-all hover:scale-[1.02] border-0 rounded-3xl self-center w-full z-30 ${sosTimerActive ? 'bg-blue-600 animate-pulse' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
                                    <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between text-white gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                                {sosTimerActive ? <Clock className="w-8 h-8 animate-spin" /> : <AlertTriangle className="w-8 h-8 animate-pulse" />}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-xl">
                                                    {sosTimerActive ? 'Live Response' : 'Emergency SOS'}
                                                </h3>
                                                {sosTimerActive ? (
                                                    <p className="text-2xl font-bold font-mono tracking-wider">{formatTime(sosTimeLeft)}</p>
                                                ) : (
                                                    <p className="text-sm font-medium text-red-100">Critical priority response</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button onClick={() => navigate("/sos")} className={`shrink-0 font-bold rounded-xl px-6 ${sosTimerActive ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-white text-red-600 hover:bg-red-50'}`}>
                                            {sosTimerActive ? 'View Status' : 'Alert'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Real-Time Visualizer Section */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                Real-Time Issue Visualizer
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Explore complaint density and severity across the city in real-time.
                            </p>
                        </div>

                        <div className="h-[600px] w-full shadow-2xl rounded-xl overflow-hidden border border-slate-200">
                            <HeatMap />
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                Report Any Civic Issue
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Our AI-powered platform handles all types of municipal complaints efficiently
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {services.map((service) => (
                                <Card key={service.title} className="group hover:shadow-xl transition duration-300 cursor-pointer border-2 border-transparent hover:border-teal-200">
                                    <CardContent className="p-6 text-center space-y-3">
                                        <div className={`w-14 h-14 mx-auto bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                                            <service.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <h3 className="font-semibold text-sm">{service.title}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{service.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center mt-10">
                            <Button onClick={() => navigate("/register")} size="lg" className="bg-teal-600 hover:bg-teal-700">
                                <Camera className="mr-2 h-5 w-5" />
                                Register Your Complaint
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Statistics Section */}
                <section className="py-16 bg-gradient-to-r from-slate-800 to-slate-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center space-y-2">
                                    <div className="w-14 h-14 mx-auto bg-teal-600/20 rounded-full flex items-center justify-center mb-4">
                                        <stat.icon className="w-7 h-7 text-teal-400" />
                                    </div>
                                    <div className="text-4xl md:text-5xl font-bold text-white">
                                        {stat.value}
                                    </div>
                                    <p className="text-sm text-slate-400">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>



                {/* How It Works Section */}
                <section id="how-it-works" className="py-20 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                How It Works
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Simple 4-step process powered by AI for quick resolution
                            </p>
                        </div>

                        <div className="grid md:grid-cols-4 gap-6">
                            {howItWorks.map((item, index) => (
                                <div key={item.step} className="relative">
                                    {/* Connection Line */}
                                    {index < howItWorks.length - 1 && (
                                        <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-teal-300 to-teal-100"></div>
                                    )}

                                    <Card className="relative bg-white hover:shadow-xl transition">
                                        <CardContent className="p-6 text-center space-y-4">
                                            <div className="relative">
                                                <div className={`w-20 h-20 mx-auto ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                                                    <item.icon className="w-10 h-10 text-white" />
                                                </div>
                                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                    {item.step}
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-lg">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* AI Features Section */}
                <section className="py-20 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left - Features */}
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                        Powered by Gen-5 AI
                                    </h2>
                                    <p className="text-lg text-slate-600">
                                        Advanced artificial intelligence ensures accurate categorization,
                                        priority assessment, and faster resolution.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                                        <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                                            <Shield className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Trust Scoring</h3>
                                            <p className="text-sm text-muted-foreground">AI-powered 0-100 credibility score for every complaint</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                                            <TrendingUp className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Risk Assessment</h3>
                                            <p className="text-sm text-muted-foreground">Automatic severity evaluation for public safety</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                            <Zap className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Smart ETR</h3>
                                            <p className="text-sm text-muted-foreground">Dynamic deadlines with auto-escalation system</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                                            <BarChart3 className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Predictive Analytics</h3>
                                            <p className="text-sm text-muted-foreground">Heatmaps, trends, and predictive insights</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right - Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-gradient-to-br from-teal-500 to-pink-500 text-white">
                                    <CardContent className="p-6 text-center">
                                        <div className="text-4xl font-bold mb-2">100%</div>
                                        <p className="text-sm text-teal-100">Zero-Typing Experience</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                                    <CardContent className="p-6 text-center">
                                        <div className="text-4xl font-bold mb-2">15min</div>
                                        <p className="text-sm text-orange-100">Emergency ETR</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                                    <CardContent className="p-6 text-center">
                                        <div className="text-4xl font-bold mb-2">&lt;5%</div>
                                        <p className="text-sm text-blue-100">Duplicate Rate</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                                    <CardContent className="p-6 text-center">
                                        <div className="text-4xl font-bold mb-2">9</div>
                                        <p className="text-sm text-green-100">AI Services</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="py-20 bg-gradient-to-br from-teal-50 to-cyan-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                About CIVIC LENS
                            </h2>
                            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                                A next-generation AI-powered civic complaint management system designed
                                to make city governance efficient, transparent, and citizen-centric.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="bg-white/80 backdrop-blur">
                                <CardContent className="p-6 text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center">
                                        <Users className="w-8 h-8 text-teal-600" />
                                    </div>
                                    <h3 className="font-bold text-lg">Citizen First</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Designed with citizens in mind - zero typing, voice support, and real-time tracking
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 backdrop-blur">
                                <CardContent className="p-6 text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                                        <Clock className="w-8 h-8 text-orange-600" />
                                    </div>
                                    <h3 className="font-bold text-lg">Fast Resolution</h3>
                                    <p className="text-sm text-muted-foreground">
                                        AI-powered prioritization and smart ETR ensure quick complaint resolution
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 backdrop-blur">
                                <CardContent className="p-6 text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-teal-600" />
                                    </div>
                                    <h3 className="font-bold text-lg">Trust & Transparency</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Complete visibility into complaint status with trust scoring system
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Ready to Report an Issue?
                        </h2>
                        <p className="text-lg text-teal-100 mb-8">
                            Join thousands of citizens making their cities better every day
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button onClick={() => navigate("/register")} size="lg" className="h-14 px-8 bg-white text-teal-700 hover:bg-teal-50 shadow-xl">
                                <Camera className="mr-2 h-5 w-5" />
                                Register Complaint
                            </Button>
                            <Button onClick={() => navigate("/admin")} size="lg" className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white shadow-xl">
                                <BarChart3 className="mr-2 h-5 w-5" />
                                Admin Dashboard
                            </Button>
                            <Button onClick={() => navigate("/control-room")} size="lg" className="h-14 px-8 bg-teal-700 hover:bg-teal-600 text-white shadow-xl">
                                <Sparkles className="mr-2 h-5 w-5" />
                                AI Control Room
                            </Button>
                        </div>
                    </div>
                </section>
        </div>
    );
}

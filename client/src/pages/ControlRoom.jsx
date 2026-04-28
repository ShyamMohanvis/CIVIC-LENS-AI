import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapDashboard from '../components/ControlRoom/MapDashboard';
import PrioritySidebar from '../components/ControlRoom/PrioritySidebar';
import AnalyticsPanel from '../components/ControlRoom/AnalyticsPanel';
import EventActionPanel from '../components/ControlRoom/EventActionPanel';
import { io } from 'socket.io-client';
import {
    Shield, Cpu, Radio, Camera, Flame, Wifi, WifiOff,
    ChevronDown, AlertTriangle, RefreshCw, ArrowLeft,
    Activity, Map, BarChart2, LogIn, Menu, X
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AI_URL = 'http://localhost:8000';

const checkEscalation = (accidents) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const recent = accidents.filter(a => a.timestamp && new Date(a.timestamp).getTime() > thirtyMinAgo);
    if (recent.length < 3) return null;
    const zones = {};
    for (const acc of recent) {
        const lat = acc.location?.latitude;
        const lng = acc.location?.longitude;
        if (!lat || !lng) continue;
        const zoneKey = `${Math.round(lat * 200)}_${Math.round(lng * 200)}`;
        zones[zoneKey] = (zones[zoneKey] || []);
        zones[zoneKey].push(acc);
    }
    for (const [key, group] of Object.entries(zones)) {
        if (group.length >= 3) {
            const zoneNames = { '5369_16189': 'Alambagh', '5370_16189': 'Hazratganj', '5371_16190': 'Gomti Nagar' };
            return {
                count: group.length,
                zone: zoneNames[key] || 'Central Zone',
                message: `${group.length} accidents detected in the same area within 30 minutes.`
            };
        }
    }
    return null;
};

const ControlRoom = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState({ accidents: [], civicIssues: [] });
    const [dashboardData, setDashboardData] = useState(null);
    const [activeLayers, setActiveLayers] = useState({ accidents: true, issues: true, heatmap: false });
    const [mobileTab, setMobileTab] = useState('map');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedEventType, setSelectedEventType] = useState(null);
    const [resolvedIds, setResolvedIds] = useState([]);
    const [escalation, setEscalation] = useState(null);

    const [aiStatus, setAiStatus] = useState('checking');
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [hotspots, setHotspots] = useState([]);
    const [lastSimResult, setLastSimResult] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [eventsRes, dashboardRes] = await Promise.all([
                fetch(`${SOCKET_URL}/api/events`),
                fetch(`${SOCKET_URL}/api/events/dashboard-data`)
            ]);
            const eventsJson = await eventsRes.json();
            const dashboardJson = await dashboardRes.json();
            if (eventsJson.success) setEvents(eventsJson.data);
            if (dashboardJson.success) setDashboardData(dashboardJson.data);
        } catch (error) {
            console.error('Failed to fetch control room data:', error);
        }
    }, []);

    const checkAiService = useCallback(async () => {
        try {
            const res = await fetch(`${AI_URL}/`, { signal: AbortSignal.timeout(3000) });
            const json = await res.json();
            if (json.status === 'ok') {
                setAiStatus('online');
                const camRes = await fetch(`${AI_URL}/cameras`);
                const camJson = await camRes.json();
                if (camJson.cameras) {
                    setCameras(camJson.cameras);
                    if (!selectedCamera) setSelectedCamera(camJson.cameras.find(c => c.active) || null);
                }
            }
        } catch {
            setAiStatus('offline');
        }
    }, [selectedCamera]);

    const fetchHotspots = useCallback(async () => {
        try {
            const res = await fetch(`${SOCKET_URL}/api/analytics/hotspots?days=90`);
            const json = await res.json();
            if (json.success) setHotspots(json.data || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        checkAiService();
        fetchHotspots();
        const aiPing = setInterval(checkAiService, 30000);
        const socket = io(SOCKET_URL);
        socket.on('new_event', (payload) => {
            if (payload.type === 'accident') {
                setEvents(prev => ({ ...prev, accidents: [payload.data, ...prev.accidents] }));
            } else if (payload.type === 'civic_issue') {
                setEvents(prev => ({ ...prev, civicIssues: [payload.data, ...prev.civicIssues] }));
            }
            setTimeout(fetchDashboardData, 1200);
        });
        socket.on('event_updated', ({ id }) => {
            setResolvedIds(prev => [...new Set([...prev, id])]);
        });
        return () => { socket.disconnect(); clearInterval(aiPing); };
    }, [fetchDashboardData, checkAiService, fetchHotspots]);

    useEffect(() => {
        const esc = checkEscalation(events.accidents);
        if (esc && !escalation) { setEscalation(esc); }
        else if (!esc) setEscalation(null);
    }, [events.accidents]);

    const toggleLayer = (layer) => setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    const handleSelectEvent = (event, type) => {
        setSelectedEvent(event);
        setSelectedEventType(type === 'accident' ? 'accident' : 'civic-issue');
    };
    const handleEventResolved = (id) => {
        setResolvedIds(prev => [...new Set([...prev, id])]);
        setSelectedEvent(null);
        setTimeout(fetchDashboardData, 1500);
    };

    const simulateCCTV = async () => {
        if (aiStatus === 'offline') return;
        setIsSimulating(true);
        setLastSimResult(null);
        try {
            const formData = new FormData();
            const blob = new Blob(['mock_image_data'], { type: 'image/jpeg' });
            formData.append('file', blob, 'cctv_frame.jpg');
            if (selectedCamera) {
                formData.append('latitude', selectedCamera.lat);
                formData.append('longitude', selectedCamera.lng);
                formData.append('camera_id', selectedCamera.id);
            }
            const res = await fetch(`${AI_URL}/detect/frame`, { method: 'POST', body: formData });
            const json = await res.json();
            setLastSimResult(json);
            if (json.status === 'accident_detected') setTimeout(fetchHotspots, 2000);
        } catch (e) {
            setLastSimResult({ error: e.message });
        }
        setTimeout(() => setIsSimulating(false), 1500);
    };

    const criticalHotspots = hotspots.filter(h => h.riskLevel === 'critical' || h.riskLevel === 'high');
    const totalActive = (events.accidents?.length || 0) + (events.civicIssues?.length || 0) - resolvedIds.length;

    return (
        <div className="fixed inset-0 bg-slate-100 overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ══════════ TEAL NAVBAR — matches site theme ══════════ */}
            <header className="relative flex-shrink-0 flex items-center justify-between px-4 h-16 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 shadow-lg z-50">

                {/* Left — Brand */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-teal-100 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="w-px h-5 bg-white/20" />
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-md">
                            <Shield className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-white font-bold text-base tracking-wide">CIVIC LENS</span>
                            <span className="text-teal-100 text-[10px] ml-2">AI Control Room</span>
                        </div>
                    </div>

                    {/* Live pulse */}
                    <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-md bg-white/10 border border-white/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                        <span className="text-white text-[10px] font-bold tracking-widest uppercase">Live</span>
                    </div>
                </div>

                {/* Center — Layer toggles (desktop) */}
                <div className="hidden md:flex items-center gap-1.5">
                    {[
                        { key: 'accidents', label: '🚨 Accidents', active: 'bg-white text-teal-700 shadow-sm' },
                        { key: 'issues',    label: '🚧 Issues',    active: 'bg-white text-teal-700 shadow-sm' },
                        { key: 'heatmap',   label: '🔥 Heatmap',   active: 'bg-white text-teal-700 shadow-sm' },
                    ].map(({ key, label, active }) => (
                        <button
                            key={key}
                            onClick={() => toggleLayer(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                activeLayers[key]
                                    ? active
                                    : 'bg-white/10 border-white/20 text-teal-100 hover:bg-white/20 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Right — Status Bar */}
                <div className="flex items-center gap-2">
                    {/* Active events count */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20">
                        <Activity className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-bold text-white">{Math.max(0, totalActive)}</span>
                        <span className="text-[10px] text-teal-100">active</span>
                    </div>

                    {/* Red Alert */}
                    {escalation && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500 border border-red-300 animate-pulse shadow-lg">
                            <AlertTriangle className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-bold text-white">RED ALERT</span>
                        </div>
                    )}

                    {/* Critical hotspots */}
                    {criticalHotspots.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/30 border border-orange-300/50 animate-pulse">
                            <Flame className="w-3.5 h-3.5 text-orange-100" />
                            <span className="text-xs font-bold text-orange-100">{criticalHotspots.length} hotspot{criticalHotspots.length > 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {/* Camera selector */}
                    {cameras.length > 0 && aiStatus === 'online' && (
                        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg">
                            <Camera className="w-3.5 h-3.5 text-teal-100 flex-shrink-0" />
                            <select
                                aria-label="Select camera"
                                value={selectedCamera?.id || ''}
                                onChange={e => {
                                    const cam = cameras.find(c => c.id === e.target.value);
                                    if (cam) setSelectedCamera(cam);
                                }}
                                className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer max-w-[110px]"
                            >
                                {cameras.map(cam => (
                                    <option key={cam.id} value={cam.id} className="bg-teal-800 text-white">
                                        {cam.active ? '🟢' : '⚫'} {cam.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Simulate */}
                    <button
                        onClick={simulateCCTV}
                        disabled={isSimulating || aiStatus === 'offline'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            isSimulating
                                ? 'bg-white/20 text-white border-white/30 animate-pulse'
                                : aiStatus === 'offline'
                                ? 'bg-white/10 text-teal-300 border-white/10 cursor-not-allowed opacity-50'
                                : 'bg-white text-teal-700 border-none hover:bg-teal-50'
                        }`}
                    >
                        <Radio className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isSimulating ? 'Scanning…' : 'CCTV Sim'}</span>
                    </button>

                    {/* AI Status badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                        aiStatus === 'online'
                            ? 'bg-green-500/20 border-green-300/40 text-green-100'
                            : aiStatus === 'offline'
                            ? 'bg-red-500/20 border-red-300/40 text-red-100'
                            : 'bg-white/10 border-white/20 text-teal-200'
                    }`}>
                        {aiStatus === 'online'   ? <Wifi className="w-3.5 h-3.5" /> :
                         aiStatus === 'offline'  ? <WifiOff className="w-3.5 h-3.5" /> :
                                                   <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span className="hidden sm:inline uppercase tracking-wide">AI {aiStatus === 'checking' ? '…' : aiStatus}</span>
                    </div>

                    {/* Mobile sidebar toggle */}
                    <button
                        onClick={() => setSidebarOpen(s => !s)}
                        className="lg:hidden p-1.5 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition"
                    >
                        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* Simulation result toast */}
            {lastSimResult && (
                <div className={`flex items-center gap-2 px-4 py-2 text-xs border-b z-50 ${
                    lastSimResult.error
                        ? 'bg-red-800/60 border-red-600 text-red-100'
                        : lastSimResult.status === 'accident_detected'
                        ? 'bg-orange-700/60 border-orange-500 text-orange-100'
                        : 'bg-teal-800/80 border-teal-700 text-teal-100'
                }`}>
                    <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                    {lastSimResult.error
                        ? `❌ AI error: ${lastSimResult.error}`
                        : lastSimResult.status === 'accident_detected'
                        ? `🚨 Accident detected — ${lastSimResult.data?.severity || '?'} severity, ${Math.round((lastSimResult.data?.confidence || 0) * 100)}% confidence`
                        : `✅ Clear — ${selectedCamera?.name || 'Default Camera'}`
                    }
                    <button onClick={() => setLastSimResult(null)} className="ml-auto text-slate-500 hover:text-white transition">✕</button>
                </div>
            )}

            {/* ══════════ MAIN BODY — Full Height Map + Floating Panels ══════════ */}
            <div className="flex-1 relative overflow-hidden">

                {/* ── MAP (absolute background) ── */}
                <div className="absolute inset-0 z-0">
                    <MapDashboard
                        events={events}
                        activeLayers={activeLayers}
                        onSelectEvent={handleSelectEvent}
                        selectedEventId={selectedEvent?._id}
                        resolvedIds={resolvedIds}
                    />
                </div>

                {/* ── LEFT PANEL — Priority Queue (floating white panel) ── */}
                <div className={`
                    absolute top-0 left-0 bottom-0 z-20
                    ${sidebarOpen || 'hidden lg:block'}
                    w-72
                    border-r border-slate-200
                    bg-white/95 backdrop-blur-sm shadow-lg
                    overflow-y-auto
                    transition-all duration-300
                `}>
                    <PrioritySidebar
                        events={events}
                        onSelectEvent={(ev, type) => { handleSelectEvent(ev, type); setSidebarOpen(false); }}
                        resolvedIds={resolvedIds}
                    />
                </div>

                {/* ── RIGHT PANEL — Analytics (floating white panel) ── */}
                <div className="absolute top-0 right-0 bottom-0 z-20 hidden xl:block w-80 border-l border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg overflow-y-auto">
                    <AnalyticsPanel dashboardData={dashboardData} escalation={escalation} />
                </div>

                {/* ── HOTSPOT LEGEND (bottom-left on desktop) ── */}
                {hotspots.length > 0 && activeLayers.heatmap && (
                    <div className="absolute bottom-20 lg:bottom-4 left-4 lg:left-[calc(18rem+1rem)] z-20 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 text-xs max-w-xs shadow-lg">
                        <p className="font-bold text-orange-600 flex items-center gap-1.5 mb-2">
                            <Flame className="w-3.5 h-3.5" /> Predictive Hotspots
                        </p>
                        {hotspots.slice(0, 4).map((h, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 py-0.5">
                                <span className="text-slate-600 font-mono text-[10px]">{h.lat.toFixed(3)}, {h.lng.toFixed(3)}</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                    h.riskLevel === 'critical' ? 'bg-red-600 text-white' :
                                    h.riskLevel === 'high'     ? 'bg-orange-500 text-white' :
                                    h.riskLevel === 'medium'   ? 'bg-yellow-500 text-black' :
                                                                 'bg-emerald-600 text-white'
                                }`}>{h.riskLevel.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── MOBILE BOTTOM TABS ── */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex z-30">
                    {[
                        { key: 'queue', label: 'Queue', icon: Activity },
                        { key: 'map', label: 'Map', icon: Map },
                        { key: 'analytics', label: 'Insights', icon: BarChart2 },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setMobileTab(key)}
                            className={`flex flex-col items-center justify-center flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                mobileTab === key ? 'text-teal-700 bg-teal-50 border-t-2 border-teal-600 -mt-px' : 'text-slate-400'
                            }`}
                        >
                            <Icon className="w-4 h-4 mb-1" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── EVENT ACTION PANEL ── */}
                {selectedEvent && (
                    <EventActionPanel
                        event={selectedEvent}
                        eventType={selectedEventType}
                        onClose={() => setSelectedEvent(null)}
                        onResolved={handleEventResolved}
                    />
                )}
            </div>
        </div>
    );
};

export default ControlRoom;

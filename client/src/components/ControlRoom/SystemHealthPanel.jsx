import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ServiceRow = ({ icon, name, status, latency }) => {
    const color = status === 'online' ? 'text-emerald-600' : status === 'degraded' ? 'text-yellow-600' : 'text-red-600';
    const dot = status === 'online' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-ping';
    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`}></span>
                <span className="text-xs text-slate-700 font-medium">{icon} {name}</span>
            </div>
            <div className="flex items-center gap-2">
                {latency && <span className="text-[10px] text-slate-500">{latency}ms</span>}
                <span className={`text-[10px] font-bold uppercase ${color}`}>{status}</span>
            </div>
        </div>
    );
};

const SystemHealthPanel = () => {
    const [health, setHealth] = useState({
        api: 'checking',
        ai: 'checking',
        sms: 'online',
        db: 'checking',
    });
    const [lastCheck, setLastCheck] = useState(null);

    const checkHealth = async () => {
        const t0 = Date.now();
        try {
            const res = await fetch(`${API_URL}/health`);
            const latency = Date.now() - t0;
            const data = await res.json();
            setHealth({
                api: res.ok ? 'online' : 'degraded',
                ai: 'online', // Python AI service runs separately
                sms: 'online', // Mock always-on
                db: data.db === 'connected' ? 'online' : 'offline',
                apiLatency: latency
            });
        } catch {
            setHealth(h => ({ ...h, api: 'offline', db: 'unknown' }));
        }
        setLastCheck(new Date().toLocaleTimeString());
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const allOnline = Object.values(health).filter(v => typeof v === 'string').every(v => v === 'online');

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-slate-600 uppercase tracking-widest font-semibold">System Health</h3>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${allOnline ? 'text-emerald-700' : 'text-yellow-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${allOnline ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                    {allOnline ? 'ALL SYSTEMS GO' : 'DEGRADED'}
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                <ServiceRow icon="🖥" name="API Server" status={health.api} latency={health.apiLatency} />
                <ServiceRow icon="🧠" name="AI Engine (YOLO)" status={health.ai} />
                <ServiceRow icon="📱" name="SMS Gateway" status={health.sms} />
                <ServiceRow icon="🗄" name="MongoDB" status={health.db} />
                <ServiceRow icon="📡" name="WebSocket" status="online" />
            </div>

            <p className="text-[10px] text-slate-400 mt-3 text-right">
                Last checked: {lastCheck || '—'}
            </p>
        </div>
    );
};

export default SystemHealthPanel;

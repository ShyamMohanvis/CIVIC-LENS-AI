import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * AIPulseWidget — A compact widget that shows the Live Urban Risk Score and AI brief.
 * Can be embedded inside any existing dashboard.
 */
const AIPulseWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/events/dashboard-data`);
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (err) {
                console.warn('AIPulseWidget: Could not fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        // Refresh every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const riskColor = !data ? 'text-gray-400' :
        data.trends.riskLevel === 'High' ? 'text-red-500' :
            data.trends.riskLevel === 'Medium' ? 'text-yellow-500' :
                'text-green-500';

    const riskBg = !data ? 'bg-gray-100' :
        data.trends.riskLevel === 'High' ? 'bg-red-50 border-red-200' :
            data.trends.riskLevel === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200';

    if (loading) {
        return (
            <div className="rounded-xl border bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white animate-pulse flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-white/20"></div>
                <div className="space-y-2 flex-1">
                    <div className="h-3 bg-white/20 rounded w-1/3"></div>
                    <div className="h-2 bg-white/10 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-xl mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Left: Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-600/30 border border-teal-500/30 flex items-center justify-center text-lg">
                        🧠
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-teal-300 uppercase tracking-widest">AI Urban Intelligence</h3>
                        <p className="text-xs text-slate-400">Live City Risk Feed</p>
                    </div>
                </div>

                {/* Middle: Risk Score */}
                {data && (
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${riskColor}`}>{data.trends.riskScore}<span className="text-sm text-slate-400">/100</span></div>
                            <div className={`text-xs font-semibold uppercase tracking-wider ${riskColor}`}>{data.trends.riskLevel} RISK</div>
                        </div>

                        <div className="w-px h-10 bg-white/10"></div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-white">{data.trends.dailyAccidents}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Crashes Today</div>
                        </div>

                        <div className="text-center">
                            <div className="text-lg font-bold text-white">{data.trends.dailyIssues}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Issues Today</div>
                        </div>
                    </div>
                )}

                {/* Right: AI Brief */}
                {data && (
                    <div className="max-w-xs text-xs text-blue-200 italic border-l border-white/10 pl-4">
                        "{data.aiSummary.length > 130 ? data.aiSummary.substring(0, 130) + '...' : data.aiSummary}"
                    </div>
                )}

                {/* CTA */}
                <Link
                    to="/control-room"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                    🗺 Open Control Room
                </Link>
            </div>
        </div>
    );
};

export default AIPulseWidget;

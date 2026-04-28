import React, { useMemo } from 'react';
import SystemHealthPanel from './SystemHealthPanel';

const getPredictiveInsight = (riskLevel, accidentCount) => {
    const hour = new Date().getHours();
    const insights = [];
    if (hour >= 7 && hour <= 10) insights.push('📈 Morning rush — accident probability 40% above average.');
    if (hour >= 17 && hour <= 20) insights.push('⚡ Evening peak — 35% more incidents between 5–8 PM.');
    if (hour >= 20 && hour <= 23) insights.push('🌙 Night conditions — reduced visibility risk in Charbagh & Alambagh.');
    if (hour >= 0 && hour <= 5) insights.push('🌑 Late-night window — highest injury severity window.');
    if (accidentCount >= 3) insights.push(`🔥 Cluster alert: ${accidentCount} accidents today — deploy extra patrol.`);
    if (riskLevel === 'High') insights.push('🚨 High risk active — recommend roadblock on major corridors.');
    return insights.length > 0 ? insights[0] : '✅ No elevated risk factors detected at this time.';
};

const CircleGauge = ({ score, level }) => {
    const color = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e';
    const radius = 42;
    const circum = 2 * Math.PI * radius;
    const arc = (score / 100) * circum;
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle
                        cx="50" cy="50" r={radius} fill="none"
                        stroke={color} strokeWidth="10"
                        strokeDasharray={`${arc} ${circum - arc}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800">{score}</span>
                    <span className="text-xs text-slate-400">/100</span>
                </div>
            </div>
            <span className="text-sm font-bold mt-1" style={{ color }}>{level.toUpperCase()} RISK</span>
        </div>
    );
};

const AnalyticsPanel = ({ dashboardData, escalation }) => {
    const trends = dashboardData?.trends;
    const aiSummary = dashboardData?.aiSummary || '';

    const predictive = useMemo(() =>
        getPredictiveInsight(trends?.riskLevel || 'Low', trends?.dailyAccidents || 0),
        [trends]
    );

    const summaryLines = useMemo(() => {
        if (!aiSummary || aiSummary.length < 30) return [];
        return aiSummary.split(/(?<=[.!?])\s+/).filter(s => s.length > 10).slice(0, 4);
    }, [aiSummary]);

    return (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto z-10">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-teal-700 to-cyan-600">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Urban Intelligence</h2>
                <p className="text-xs text-teal-100 mt-0.5">Live — auto-refreshes every 60s</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Risk Gauge */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col items-center gap-3">
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest w-full text-center">Current Risk Level</h3>
                    <CircleGauge score={trends?.riskScore || 0} level={trends?.riskLevel || 'Low'} />
                </div>

                {/* Escalation */}
                {escalation && (
                    <div className="bg-red-50 border-2 border-red-200 shadow-sm rounded-xl p-4 animate-pulse">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <h3 className="text-red-700 font-bold text-sm uppercase">🚨 Red Alert</h3>
                        </div>
                        <p className="text-red-800 text-xs font-semibold">{escalation.message}</p>
                        <p className="text-red-600 text-[10px] mt-1">{escalation.zone} — {escalation.count} accidents in 30 min</p>
                    </div>
                )}

                {/* 24h Trends */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-3">24-Hour Trends</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-700">🚨 Accidents</span>
                            <div className="text-right">
                                <span className="text-slate-800 font-bold">{trends?.dailyAccidents ?? '--'}</span>
                                {trends?.accidentTrend !== undefined && (
                                    <span className={`text-xs ml-2 font-semibold ${trends.accidentTrend > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {trends.accidentTrend > 0 ? '↑' : '↓'} {Math.abs(trends.accidentTrend)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-700">🚧 Civic Issues</span>
                            <div className="text-right">
                                <span className="text-slate-800 font-bold">{trends?.dailyIssues ?? '--'}</span>
                                {trends?.issueTrend !== undefined && (
                                    <span className={`text-xs ml-2 font-semibold ${trends.issueTrend > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                        {trends.issueTrend > 0 ? '↑' : '↓'} {Math.abs(trends.issueTrend)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Predictive Insight */}
                <div className="bg-teal-50 border border-teal-100 shadow-sm rounded-xl p-4">
                    <h3 className="text-xs text-teal-700 uppercase tracking-widest mb-2 font-semibold flex items-center gap-1">
                        🔮 Predictive Insight
                    </h3>
                    <p className="text-xs text-teal-900 leading-relaxed font-medium">{predictive}</p>
                </div>

                {/* AI Intelligence Brief */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span>✨</span>
                        <h3 className="text-xs text-slate-600 uppercase tracking-widest font-semibold">AI Intelligence Brief</h3>
                    </div>
                    {summaryLines.length > 0 ? (
                        <ul className="space-y-2">
                            {summaryLines.map((line, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                                    <span className="text-teal-600 font-bold mt-0.5 flex-shrink-0">›</span>
                                    {line}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-400 italic">{aiSummary || 'Generating intelligence brief…'}</p>
                    )}
                    {trends && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recommended Action</p>
                            <p className="text-xs font-semibold text-emerald-700">
                                {trends.riskLevel === 'High'
                                    ? '🚨 Deploy additional units to high-density corridors.'
                                    : trends.riskLevel === 'Medium'
                                        ? '⚠️ Increase ambulance standby in rising accident zones.'
                                        : '✅ Maintain current levels. Monitor NH-27 traffic flow.'}
                            </p>
                        </div>
                    )}
                </div>

                <SystemHealthPanel />
            </div>
        </div>
    );
};

export default AnalyticsPanel;

import React, { useMemo } from 'react';

const getPriorityScore = (event) => {
    const severityWeight = { high: 100, medium: 60, low: 20 }[event.severity || 'medium'] || 60;
    const ts = event.timestamp || event.createdAt;
    const ageMinutes = ts ? (Date.now() - new Date(ts).getTime()) / 60000 : 0;
    const timeWeight = Math.min(ageMinutes * 1.5, 50);
    return severityWeight + timeWeight;
};

const getPriorityLabel = (score) => {
    if (score >= 140) return { label: 'CRITICAL', color: 'text-red-700',    bg: 'bg-red-100 border border-red-200',    ping: 'bg-red-500' };
    if (score >= 100) return { label: 'HIGH',     color: 'text-orange-700', bg: 'bg-orange-100 border border-orange-200', ping: 'bg-orange-500' };
    if (score >= 60)  return { label: 'MEDIUM',   color: 'text-yellow-700', bg: 'bg-yellow-100 border border-yellow-200', ping: 'bg-yellow-500' };
    return               { label: 'LOW',      color: 'text-slate-500',  bg: 'bg-slate-100 border border-slate-200',  ping: 'bg-slate-400' };
};

const formatRelTime = (ts) => {
    if (!ts) return '--';
    const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
};

const PrioritySidebar = ({ events, onSelectEvent, resolvedIds = [] }) => {
    const prioritized = useMemo(() => {
        const accidents = (events.accidents || [])
            .filter(e => !resolvedIds.includes(e._id ?? e.id))
            .map(e => ({ ...e, _type: 'accident', _score: getPriorityScore(e) }));
        const issues = (events.civicIssues || [])
            .filter(e => !resolvedIds.includes(e._id ?? e.id))
            .map(e => ({ ...e, _type: 'civic_issue', _score: getPriorityScore(e) }));
        return [...accidents, ...issues].sort((a, b) => b._score - a._score);
    }, [events, resolvedIds]);

    const criticals = prioritized.filter(e => e._score >= 140).length;

    return (
        <div className="w-72 bg-white border-r border-slate-200 shadow-sm flex flex-col overflow-hidden z-10">
            {/* Header — matches teal theme */}
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-700 to-cyan-600">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Priority Queue</h2>
                        <p className="text-xs text-teal-100 mt-0.5">{prioritized.length} active events</p>
                    </div>
                    {criticals > 0 && (
                        <div className="flex items-center gap-1.5 bg-red-500 border border-red-300 px-2 py-1 rounded-lg animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            <span className="text-[10px] font-bold text-white">{criticals} CRITICAL</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto">
                {prioritized.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                        <span className="text-2xl block mb-2">✅</span>
                        No active events
                        <p className="text-xs text-slate-400 mt-1">City monitoring active</p>
                    </div>
                ) : (
                    prioritized.map((event, idx) => {
                        const priority = getPriorityLabel(event._score);
                        const isAccident = event._type === 'accident';
                        const isTop3 = idx < 3;
                        return (
                            <div
                                key={event._id || idx}
                                onClick={() => onSelectEvent(event, event._type)}
                                className={`p-3 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${isTop3 ? 'bg-slate-50/50' : ''}`}
                            >
                                <div className="flex items-start gap-2.5">
                                    {/* Priority dot */}
                                    <div className="flex-shrink-0 mt-1">
                                        <span className={`w-2 h-2 rounded-full block ${priority.ping} ${event._score >= 100 ? 'animate-pulse' : ''}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold ${priority.color}`}>{priority.label}</span>
                                            <span className="text-[10px] text-slate-400">{formatRelTime(event.timestamp || event.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-slate-800 font-medium truncate">
                                            {isAccident ? '🚨 Crash Detected' : `🚧 ${event.category || 'Civic Issue'}`}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            Severity: <strong className={priority.color}>{(event.severity || 'medium').toUpperCase()}</strong>
                                            {isAccident && event.confidence && ` · ${Math.round((event.confidence || 0) * 100)}% conf.`}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                            {event.location?.latitude?.toFixed(4)}, {event.location?.longitude?.toFixed(4)}
                                        </p>
                                    </div>

                                    {/* Score badge */}
                                    <div className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                                        {Math.round(event._score)}
                                    </div>
                                </div>

                                {isTop3 && (
                                    <div className="mt-2 ml-4">
                                        <span className="text-[10px] font-semibold text-teal-600 hover:text-teal-500 transition">
                                            → Tap to take action
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 text-center bg-slate-50">
                <p className="text-[10px] text-slate-400">Score = Severity × 0.5 + Wait × 0.2</p>
            </div>
        </div>
    );
};

export default PrioritySidebar;

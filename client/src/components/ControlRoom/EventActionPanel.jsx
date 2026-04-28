import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Simulated available units
const UNITS = {
    ambulances: [
        { id: 'A1', name: 'Ambulance 1', distance: '2.4 km', status: 'available' },
        { id: 'A2', name: 'Ambulance 2', distance: '5.1 km', status: 'busy' },
        { id: 'A3', name: 'Ambulance 3', distance: '3.7 km', status: 'available' },
    ],
    police: [
        { id: 'P1', name: 'Unit Alpha', distance: '1.8 km', status: 'available' },
        { id: 'P2', name: 'Unit Bravo', distance: '4.2 km', status: 'available' },
        { id: 'P3', name: 'Unit Charlie', distance: '6.0 km', status: 'busy' },
    ]
};

const formatTime = (ts) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getZoneName = (lat) => {
    // Map approximate lat bands to Lucknow zone names for visual richness
    if (lat > 26.87) return 'Gomti Nagar';
    if (lat > 26.85) return 'Hazratganj';
    if (lat > 26.83) return 'Alambagh';
    return 'Charbagh';
};

/**
 * EventActionPanel — slides in from the right when an event is selected on the map.
 */
const EventActionPanel = ({ event, eventType, onClose, onResolved }) => {
    const [status, setStatus] = useState('idle'); // idle | assigning | resolved | error
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [actionLog, setActionLog] = useState([]);

    if (!event) return null;

    const isAccident = eventType === 'accident';
    const severity = event.severity || 'medium';
    const zone = getZoneName(event.location?.latitude);
    const time = formatTime(event.timestamp || event.createdAt);

    const severityColor = severity === 'high' ? 'text-red-700 bg-red-100 border-red-200' :
        severity === 'medium' ? 'text-yellow-700 bg-yellow-100 border-yellow-200' :
            'text-green-700 bg-green-100 border-green-200';

    const addLog = (msg) => setActionLog(prev => [{ msg, time: new Date().toLocaleTimeString() }, ...prev]);

    const handleAction = async (actionType, unit = null) => {
        setStatus('assigning');
        addLog(`⚡ ${actionType} initiated...`);
        try {
            const endpoint = isAccident ? 'accident' : 'civic-issue';
            const res = await fetch(`${API_URL}/api/events/${endpoint}/${event._id}/action`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionType, assignedUnit: unit?.id })
            });
            const data = await res.json();
            if (data.success) {
                addLog(`✅ ${actionType} confirmed — ${unit ? unit.name + ' dispatched' : 'action logged'}`);
                if (actionType === 'resolve') { setStatus('resolved'); onResolved?.(event._id); }
                else setStatus('idle');
            } else {
                addLog(`❌ Action failed: ${data.message}`);
                setStatus('error');
                setTimeout(() => setStatus('idle'), 2000);
            }
        } catch (e) {
            addLog(`📴 Offline — action logged locally`);
            setStatus('idle');
        }
    };

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className={`p-4 border-b border-slate-200 flex justify-between items-start ${isAccident ? 'bg-red-50' : 'bg-orange-50'}`}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${severityColor}`}>
                            {severity.toUpperCase()} SEVERITY
                        </span>
                    </div>
                    <h2 className="text-slate-800 font-bold text-lg">
                        {isAccident ? '🚨 Road Accident' : `🚧 ${event.category || 'Civic Issue'}`}
                    </h2>
                    <p className="text-slate-500 text-sm">📍 {zone} • 🕒 {time}</p>
                    {isAccident && event.confidence && (
                        <p className="text-slate-400 text-xs mt-1">AI Confidence: {Math.round((event.confidence || 0) * 100)}%</p>
                    )}
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-800 text-2xl font-light leading-none ml-3">×</button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Quick Actions */}
                <div>
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => window.open(`https://www.google.com/maps?q=${event.location?.latitude},${event.location?.longitude}`, '_blank')}
                            className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 shadow-sm text-sm font-semibold p-3 rounded-lg transition"
                        >
                            📍 Open in Maps
                        </button>
                        <button
                            onClick={() => { addLog('📞 Control room call initiated'); }}
                            className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-sm text-sm font-semibold p-3 rounded-lg transition"
                        >
                            📞 Call Control
                        </button>
                    </div>
                </div>

                {/* Resource Dispatch */}
                {isAccident && (
                    <div>
                        <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Dispatch Ambulance</h3>
                        <div className="space-y-2">
                            {UNITS.ambulances.map(unit => (
                                <div
                                    key={unit.id}
                                    onClick={() => unit.status === 'available' && setSelectedUnit(unit)}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition
                    ${unit.status === 'busy' ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed text-slate-400' :
                                            selectedUnit?.id === unit.id ? 'border-emerald-500 bg-emerald-50' :
                                                'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                                >
                                    <div>
                                        <p className="text-sm text-slate-800 font-bold">🚑 {unit.name}</p>
                                        <p className="text-xs text-slate-500">{unit.distance} away</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${unit.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {unit.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => selectedUnit && handleAction('dispatch_ambulance', selectedUnit)}
                            disabled={!selectedUnit || status === 'assigning'}
                            className="w-full mt-2 shadow-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold py-2.5 rounded-lg transition text-sm"
                        >
                            {status === 'assigning' ? '⏳ Dispatching...' : `🚑 Dispatch ${selectedUnit ? selectedUnit.name : '— Select Unit'}`}
                        </button>
                    </div>
                )}

                {/* Police Dispatch */}
                {isAccident && (
                    <div>
                        <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-3">Notify Police</h3>
                        <div className="space-y-2">
                            {UNITS.police.map(unit => (
                                <div
                                    key={unit.id}
                                    onClick={() => unit.status === 'available' && handleAction('notify_police', unit)}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition
                    ${unit.status === 'busy' ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed text-slate-400' :
                                            'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 shadow-sm'}`}
                                >
                                    <div>
                                        <p className="text-sm text-slate-800 font-bold">🚓 {unit.name}</p>
                                        <p className="text-xs text-slate-500">{unit.distance} away</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${unit.status === 'available' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {unit.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Log */}
                {actionLog.length > 0 && (
                    <div>
                        <h3 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Action Log</h3>
                        <div className="space-y-2 max-h-28 overflow-y-auto">
                            {actionLog.map((log, i) => (
                                <p key={i} className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-100 px-2 py-1.5 rounded">
                                    <span className="text-slate-400 mr-2">{log.time}</span>{log.msg}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 space-y-2">
                {status !== 'resolved' ? (
                    <button
                        onClick={() => handleAction('resolve')}
                        disabled={status === 'assigning'}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md font-bold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
                    >
                        ✅ Mark as Resolved
                    </button>
                ) : (
                    <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 rounded-lg text-sm text-center shadow-sm">
                        ✅ Event Resolved
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventActionPanel;

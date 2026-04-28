import React from 'react';

const Sidebar = ({ events }) => {
    const { accidents = [], civicIssues = [] } = events;

    // Combine and sort by newest first
    const allEvents = [
        ...accidents.map(a => ({ ...a, type: 'accident', time: new Date(a.timestamp || a.createdAt) })),
        ...civicIssues.map(i => ({ ...i, type: 'issue', time: new Date(i.createdAt) }))
    ].sort((a, b) => b.time - a.time).slice(0, 50); // Show last 50

    return (
        <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-lg z-20">
            <div className="p-4 border-b border-gray-800 bg-gray-950">
                <h2 className="text-lg font-bold text-gray-200">REAL-TIME FEED</h2>
                <p className="text-xs text-green-400 mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Live Monitoring Active
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {allEvents.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center mt-10">No recent activity detected.</p>
                ) : (
                    allEvents.map((evt, idx) => (
                        <div key={evt._id || idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700 shadow flex flex-col hover:border-gray-500 transition-colors cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${evt.type === 'accident'
                                        ? evt.severity === 'high' ? 'bg-red-900 text-red-200' : 'bg-red-900/50 text-red-300'
                                        : 'bg-orange-900/50 text-orange-300'
                                    }`}>
                                    {evt.type === 'accident' ? '🚨 Crash Detected' : '🚧 Civic Issue'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="text-sm text-gray-200">
                                {evt.type === 'accident' ? (
                                    <p>Severity: <span className="font-semibold">{evt.severity}</span></p>
                                ) : (
                                    <p className="capitalize">{evt.category} reported ({evt.severity})</p>
                                )}
                            </div>

                            <div className="text-xs text-gray-500 mt-2 flex justify-between">
                                <span>Lat: {evt.location.latitude.toFixed(4)}</span>
                                <span>Lng: {evt.location.longitude.toFixed(4)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Sidebar;

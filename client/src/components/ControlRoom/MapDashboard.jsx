import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const accidentIcon = (severity, selected) => L.divIcon({
    className: '',
    html: `
    <div style="
      width:${severity === 'high' ? 20 : 14}px;
      height:${severity === 'high' ? 20 : 14}px;
      border-radius:50%;
      background:${severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f97316' : '#eab308'};
      border:${selected ? '3px solid white' : '2px solid rgba(255,255,255,0.5)'};
      box-shadow:0 0 ${severity === 'high' ? '12px' : '6px'} ${severity === 'high' ? '#ef4444aa' : '#f97316aa'};
    "></div>`,
    iconAnchor: [10, 10]
});

const issueIcon = (selected) => L.divIcon({
    className: '',
    html: `<div style="
    width:14px; height:14px; border-radius:3px;
    background:#f59e0b; border:${selected ? '3px solid white' : '2px solid rgba(255,255,255,0.4)'};
    box-shadow:0 0 6px #f59e0baa;
    transform:rotate(45deg);
  "></div>`,
    iconAnchor: [7, 7]
});

// Time window filter in hours
const TIME_WINDOWS = [1, 6, 24, 168]; // 1h, 6h, 24h, 7 days

const filterByWindow = (list, timestampKey, hours) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return list.filter(e => {
        const ts = e[timestampKey];
        return ts ? new Date(ts) >= cutoff : true;
    });
};

const MapDashboard = ({ events, activeLayers, onSelectEvent, selectedEventId, resolvedIds = [] }) => {
    const center = [26.8467, 80.9462]; // Lucknow
    const [timeWindow, setTimeWindow] = useState(24);
    const [showHeatmapBlobs, setShowHeatmapBlobs] = useState(false);

    useEffect(() => {
        setShowHeatmapBlobs(activeLayers.heatmap);
    }, [activeLayers.heatmap]);

    const accidents = filterByWindow(
        (events.accidents || []).filter(e => !resolvedIds.includes(e._id)),
        'timestamp', timeWindow
    );
    const issues = filterByWindow(
        (events.civicIssues || []).filter(e => !resolvedIds.includes(e._id)),
        'createdAt', timeWindow
    );

    return (
        <div className="relative w-full h-full z-0 isolate">
            {/* Time Window Slider */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 bg-white/95 backdrop-blur border border-slate-200 rounded-full px-3 py-1.5 shadow-md">
                <span className="text-xs text-slate-500 mr-2 font-medium">📅 Show:</span>
                {TIME_WINDOWS.map(w => (
                    <button
                        key={w}
                        onClick={() => setTimeWindow(w)}
                        className={`text-xs px-2.5 py-0.5 rounded-full transition font-semibold
              ${timeWindow === w ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {w === 1 ? '1h' : w === 6 ? '6h' : w === 24 ? '24h' : '7d'}
                    </button>
                ))}
                <span className="text-[10px] text-slate-400 ml-2 font-medium">{accidents.length + issues.length} events</span>
            </div>

            <MapContainer
                center={center}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                {/* HUD Dark Theme Tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                    maxZoom={19}
                />

                {/* Accident markers */}
                {activeLayers.accidents && accidents.map((accident) => {
                    const lat = accident.location?.latitude;
                    const lng = accident.location?.longitude;
                    if (!lat || !lng) return null;
                    const isSelected = selectedEventId === (accident._id);
                    return (
                        <Marker
                            key={accident._id}
                            position={[lat, lng]}
                            icon={accidentIcon(accident.severity, isSelected)}
                            eventHandlers={{ click: () => onSelectEvent?.(accident, 'accident') }}
                        >
                            <Popup>
                                <div className="text-xs font-bold text-slate-800">
                                    🚨 {accident.severity?.toUpperCase()} Accident<br />
                                    <span className="font-medium text-slate-500">Click to take action →</span>
                                </div>
                            </Popup>
                            {/* Pulse ring for high severity */}
                            {accident.severity === 'high' && (
                                <Circle center={[lat, lng]} radius={150} pathOptions={{ color: '#ef4444', fillOpacity: 0.08, weight: 1.5, dashArray: '4' }} />
                            )}
                        </Marker>
                    );
                })}

                {/* Civic issue markers */}
                {activeLayers.issues && issues.map((issue) => {
                    const lat = issue.location?.latitude;
                    const lng = issue.location?.longitude;
                    if (!lat || !lng) return null;
                    const isSelected = selectedEventId === (issue._id);
                    return (
                        <Marker
                            key={issue._id}
                            position={[lat, lng]}
                            icon={issueIcon(isSelected)}
                            eventHandlers={{ click: () => onSelectEvent?.(issue, 'civic_issue') }}
                        >
                            <Popup>
                                <div className="text-xs font-bold text-slate-800">
                                    🚧 {issue.category || 'Civic Issue'}<br />
                                    <span className="font-medium text-slate-500">Click to take action →</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Heatmap blobs */}
                {showHeatmapBlobs && accidents.map((acc) => {
                    const lat = acc.location?.latitude;
                    const lng = acc.location?.longitude;
                    if (!lat || !lng) return null;
                    return (
                        <Circle key={`heat-${acc._id}`} center={[lat, lng]}
                            radius={acc.severity === 'high' ? 500 : 300}
                            pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.12 }}
                        />
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapDashboard;

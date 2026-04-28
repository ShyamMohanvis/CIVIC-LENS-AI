import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// 1. Internal component to handle the Leaflet Heat Layer
function HeatmapLayer({ points }) {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        let heatLayer = null;
        let isActive = true;

        const loadLayer = async () => {
            try {
                // Ensure global L is available for the plugin
                if (typeof window !== 'undefined') window.L = L;

                // Dynamically import the plugin
                await import('leaflet.heat');

                if (!isActive) return;

                if (L.heatLayer) {
                    const heatPoints = points.map(p => {
                        const lat = p.lat || (p.location?.coordinates ? p.location.coordinates[1] : 0);
                        const lng = p.lng || (p.location?.coordinates ? p.location.coordinates[0] : 0);
                        const weight = p.weight || 1;
                        return [lat, lng, weight];
                    });

                    heatLayer = L.heatLayer(heatPoints, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 17,
                        gradient: {
                            0.4: 'blue',
                            0.6: 'cyan',
                            0.7: 'lime',
                            0.8: 'yellow',
                            1.0: 'red'
                        }
                    });

                    heatLayer.addTo(map);
                } else {
                    console.error("L.heatLayer missing after import");
                }
            } catch (error) {
                console.error("Failed to load leaflet.heat", error);
            }
        };

        loadLayer();

        // Cleanup
        return () => {
            isActive = false;
            if (heatLayer && map) {
                try {
                    map.removeLayer(heatLayer);
                } catch (e) {
                    console.warn("Cleanup error", e);
                }
            }
        };
    }, [points, map]);

    return null;
}

// 3. Component to render numbered cluster markers
function ClusterMarkers({ clusters }) {
    const map = useMap();

    useEffect(() => {
        // Create custom numbered markers
        clusters.forEach(cluster => {
            const icon = L.divIcon({
                className: 'custom-cluster-marker',
                html: `<div style="
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${cluster.count}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            const marker = L.marker([cluster.lat, cluster.lng], { icon });
            marker.addTo(map);

            // Store reference for cleanup
            if (!map._clusterMarkers) map._clusterMarkers = [];
            map._clusterMarkers.push(marker);
        });

        // Cleanup
        return () => {
            if (map._clusterMarkers) {
                map._clusterMarkers.forEach(m => map.removeLayer(m));
                map._clusterMarkers = [];
            }
        };
    }, [clusters, map]);

    return null;
}

// 4. Component to handle User Location
function UserLocation() {
    const map = useMap();
    const [position, setPosition] = useState(null);

    useEffect(() => {
        map.locate({ setView: true, maxZoom: 14 });

        const onLocationFound = (e) => {
            setPosition(e.latlng);
        };

        const onLocationError = (e) => {
            console.warn("Location access denied or failed:", e.message);
        };

        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);

        return () => {
            map.off('locationfound', onLocationFound);
            map.off('locationerror', onLocationError);
        };
    }, [map]);

    return position === null ? null : (
        <CircleMarker center={position} radius={10} pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}>
            <Popup>You are here</Popup>
        </CircleMarker>
    );
}

// 2. Main HeatMap Component
export default function HeatMap() {
    const [heatmapData, setHeatmapData] = useState([]);
    const [clusterData, setClusterData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30'); // Default 30 days
    const ulbCode = 'UP-LKO-001'; // Default Lucknow

    // Default center (NIET/Greater Noida)
    const defaultCenter = [28.4612, 77.4983];

    useEffect(() => {
        fetchHeatmapData();
    }, [timeRange]);

    // GENERATE DUMMY DATA FOR DEMO (Greater Noida Region)
    useEffect(() => {
        const generateDummyPoints = () => {
            const centerLat = 28.4612;
            const centerLng = 77.4983;
            const points = [];

            // Create a dense cluster (Circular)
            for (let i = 0; i < 80; i++) {
                // Random angle and radius
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.008; // Small radius (~800m)

                const lat = centerLat + radius * Math.cos(angle);
                const lng = centerLng + radius * Math.sin(angle);

                points.push({
                    lat: lat,
                    lng: lng,
                    weight: 0.5 + Math.random() * 0.5 // High intensity
                });
            }
            return points;
        };

        const dummyPoints = generateDummyPoints();
        setHeatmapData(prev => [...prev, ...dummyPoints]);
    }, []);

    // GENERATE CLUSTER MARKERS (numbered red circles)
    useEffect(() => {
        const generateClusters = () => {
            const centerLat = 28.4612;
            const centerLng = 77.4983;
            const clusters = [];

            // Create 12-15 random cluster markers
            const numClusters = 12 + Math.floor(Math.random() * 4);

            for (let i = 0; i < numClusters; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.005 + Math.random() * 0.015; // Spread across ~2km

                const lat = centerLat + radius * Math.cos(angle);
                const lng = centerLng + radius * Math.sin(angle);

                clusters.push({
                    lat: lat,
                    lng: lng,
                    count: Math.floor(15 + Math.random() * 40) // Random count 15-55
                });
            }
            return clusters;
        };

        setClusterData(generateClusters());
    }, []);

    const fetchHeatmapData = async () => {
        setLoading(true);
        try {
            // Using correct port 5000 and route structure
            const res = await axios.get(`http://localhost:5000/api/analytics/heatmaps/${ulbCode}?timeRange=${timeRange}`);
            if (res.data.success) {
                setHeatmapData(res.data.data);
            }
        } catch (error) {
            console.error("Failed to load heatmap data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm h-full w-full">
            <CardContent className="p-0 relative h-[600px] rounded-lg overflow-hidden">

                {/* Map Controls Overlay */}
                <div className="absolute top-4 right-4 z-[500] bg-slate-900/80 p-2 rounded-lg border border-white/10 backdrop-blur-md flex gap-2">
                    <span className="text-white text-sm font-medium self-center mr-2">Time Range:</span>
                    {['7', '30', '365'].map((range) => (
                        <Button
                            key={range}
                            size="sm"
                            variant={timeRange === range ? "default" : "ghost"}
                            className={timeRange === range ? "bg-blue-600" : "text-slate-300 hover:text-white hover:bg-white/10"}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === '365' ? '1 Year' : `${range} Days`}
                        </Button>
                    ))}
                </div>

                {loading && (
                    <div className="absolute inset-0 z-[501] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    </div>
                )}

                <MapContainer
                    center={defaultCenter}
                    zoom={14}
                    style={{ height: "100%", width: "100%" }}
                    className="z-0"
                >
                    {/* Standard OSM Tiles to fix 'Black Map' issue */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {!loading && <HeatmapLayer points={heatmapData} />}
                    <ClusterMarkers clusters={clusterData} />
                    <UserLocation />
                </MapContainer>
            </CardContent>
        </Card>
    );
}

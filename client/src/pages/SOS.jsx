import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, Phone, Shield, MapPin, Loader2 } from "lucide-react";
// Navbar removed from imports

export default function SOS() {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nearbyServices, setNearbyServices] = useState([]);

    useEffect(() => {
        // Mock location for testing (GPS disabled for easier demo)
        setLoading(true);
        setTimeout(() => {
            setLocation({
                lat: 28.6139, // New Delhi coordinates
                lng: 77.2090,
            });
            setNearbyServices([
                { name: "Central Police Station", distance: "1.2 km", phone: "100" },
                { name: "City General Hospital", distance: "2.5 km", phone: "108" },
                { name: "Fire Brigade HQ", distance: "3.0 km", phone: "101" }
            ]);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="page-wrapper bg-red-50">
            <div className="page-container page-section">

                <div className="mb-4">
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/">← Back</Link>
                    </Button>
                </div>

                <div className="flex flex-col items-center space-y-6 text-center">
                    <div className="relative p-6">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                        <div className="relative p-4 bg-red-100 rounded-full dark:bg-red-900/50">
                            <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-red-700 dark:text-red-400">EMERGENCY SOS</h1>
                    <p className="max-w-xs text-muted-foreground">
                        Press/Hold to contact nearest emergency services immediately.
                    </p>

                    {loading ? (
                        <div className="flex items-center space-x-2 text-red-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Locating you...</span>
                        </div>
                    ) : location ? (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                            <MapPin className="w-4 h-4" />
                            <span>Location Detected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                        </div>
                    ) : (
                        <div className="text-sm text-red-500">Could not fetch location</div>
                    )}

                    <div className="w-full max-w-sm space-y-4">
                        <Button asChild className="w-full h-16 text-lg bg-red-600 shadow-lg hover:bg-red-700 shadow-red-500/30 animate-pulse">
                            <a href="tel:100">
                                <Phone className="mr-2 w-6 h-6" /> Call Police (100)
                            </a>
                        </Button>
                        <Button asChild className="w-full h-16 text-lg bg-orange-600 shadow-lg hover:bg-orange-700 shadow-orange-500/30">
                            <a href="tel:108">
                                <Shield className="mr-2 w-6 h-6" /> Call Ambulance (108)
                            </a>
                        </Button>
                    </div>

                    {nearbyServices.length > 0 && (
                        <div className="w-full max-w-sm mt-8 text-left">
                            <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">Nearby Services</h3>
                            <div className="space-y-3">
                                {nearbyServices.map((service, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm dark:bg-gray-800 border-red-100 dark:border-red-900/50">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{service.name}</p>
                                            <p className="text-xs text-muted-foreground">{service.distance} away</p>
                                        </div>
                                        <Button asChild size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                                            <a href={`tel:${service.phone}`}>Call</a>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

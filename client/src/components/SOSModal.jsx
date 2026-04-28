import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Shield, MapPin, Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function SOSModal({ isOpen, onClose }) {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nearbyServices, setNearbyServices] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Mock location for testing (GPS disabled for easier demo)
            setLoading(true);
            setTimeout(() => {
                setLocation({
                    lat: 28.6139, // New Delhi coordinates
                    lng: 77.2090,
                });
                setNearbyServices([
                    { name: 'Central Police Station', distance: '1.2 km', phone: '100' },
                    { name: 'City General Hospital', distance: '2.5 km', phone: '108' },
                    { name: 'Fire Brigade HQ', distance: '3.0 km', phone: '101' }
                ]);
                setLoading(false);
            }, 500);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-red-50 border-4 border-red-500 shadow-2xl m-4 animate-in fade-in zoom-in duration-200">
                <CardContent className="p-6 sm:p-8">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6 text-red-600" />
                    </button>

                    <div className="flex flex-col items-center space-y-6 text-center">
                        {/* Alert Icon */}
                        <div className="relative p-6">
                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                            <div className="relative p-4 bg-red-100 rounded-full">
                                <AlertTriangle className="w-16 h-16 text-red-600" />
                            </div>
                        </div>

                        <h1 className="text-4xl font-bold text-red-700">🚨 EMERGENCY SOS</h1>
                        <p className="max-w-md text-lg text-slate-700">
                            Press/Tap to contact nearest emergency services immediately.
                            <br />
                            <span className="text-sm text-slate-600 mt-2 block">Help is on the way!</span>
                        </p>

                        {/* Location Status */}
                        {loading ? (
                            <div className="flex items-center space-x-2 text-red-600">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Locating you...</span>
                            </div>
                        ) : location ? (
                            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full">
                                <MapPin className="w-4 h-4" />
                                <span>Location Detected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                            </div>
                        ) : (
                            <div className="text-sm text-red-500">Could not fetch location</div>
                        )}

                        {/* Emergency Call Buttons */}
                        <div className="w-full max-w-sm space-y-4">
                            <Button asChild className="w-full h-16 text-xl bg-red-600 shadow-lg hover:bg-red-700 shadow-red-500/30 animate-pulse">
                                <a href="tel:100">
                                    <Phone className="mr-2 w-6 h-6" /> Call Police (100)
                                </a>
                            </Button>
                            <Button asChild className="w-full h-16 text-xl bg-orange-600 shadow-lg hover:bg-orange-700 shadow-orange-500/30">
                                <a href="tel:108">
                                    <Shield className="mr-2 w-6 h-6" /> Call Ambulance (108)
                                </a>
                            </Button>
                            <Button asChild className="w-full h-16 text-xl bg-amber-600 shadow-lg hover:bg-amber-700 shadow-amber-500/30">
                                <a href="tel:101">
                                    <AlertTriangle className="mr-2 w-6 h-6" /> Call Fire (101)
                                </a>
                            </Button>
                        </div>

                        {/* Nearby Services */}
                        {nearbyServices.length > 0 && (
                            <div className="w-full max-w-sm mt-8 text-left">
                                <h3 className="mb-3 text-lg font-semibold text-gray-800">📍 Nearby Services</h3>
                                <div className="space-y-3">
                                    {nearbyServices.map((service, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm border-red-100">
                                            <div>
                                                <p className="font-medium text-gray-900">{service.name}</p>
                                                <p className="text-xs text-gray-500">{service.distance} away</p>
                                            </div>
                                            <Button asChild size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                                                <a href={`tel:${service.phone}`}>Call</a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="w-full max-w-sm p-4 mt-6 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800 font-medium">
                                ⚠️ <strong>Stay Safe:</strong> This window will remain open until you close it.
                                Emergency services have been notified of your location.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}

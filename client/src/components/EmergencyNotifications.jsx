import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Bell, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EmergencyNotifications() {
    const [notifications, setNotifications] = useState([]);
    const socketRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        // Connect to Socket.IO
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ Connected to notification server');
        });

        // Listen for admin acknowledgments
        socket.on('EMERGENCY_ACKNOWLEDGED', (data) => {
            console.log('📢 Received acknowledgment:', data);

            // Play notification sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play failed:', e));
            }

            // Add notification
            const notification = {
                id: Date.now(),
                type: 'acknowledgment',
                message: `✅ Admin has acknowledged your emergency!`,
                subMessage: 'Help is on the way. Stay safe!',
                timestamp: new Date(data.timestamp), ByAdmin: data.acknowledgedBy
            };

            setNotifications(prev => [notification, ...prev]);

            // Show browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Emergency Acknowledged', {
                    body: 'Admin has acknowledged your SOS. Help is on the way!',
                    icon: '/sos-icon.png',
                    tag: 'emergency-ack'
                });
            }

            // Auto-remove after 10 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 10000);
        });

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            socket.disconnect();
        };
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (notifications.length === 0) return null;

    return (
        <>
            {/* Notification Sound */}
            <audio
                ref={audioRef}
                src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"
                preload="auto"
            />

            {/* Notification Toast Stack */}
            <div className="fixed top-20 right-4 z-[9998] space-y-3 max-w-sm">
                {notifications.map((notif) => (
                    <Card
                        key={notif.id}
                        className="bg-green-50 border-2 border-green-500 shadow-2xl animate-in slide-in-from-right"
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-green-900 text-sm">
                                        {notif.message}
                                    </p>
                                    <p className="text-green-700 text-xs mt-1">
                                        {notif.subMessage}
                                    </p>
                                    <p className="text-green-600 text-xs mt-2">
                                        {notif.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeNotification(notif.id)}
                                    className="flex-shrink-0 p-1 rounded hover:bg-green-100"
                                >
                                    <X className="w-4 h-4 text-green-700" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    );
}

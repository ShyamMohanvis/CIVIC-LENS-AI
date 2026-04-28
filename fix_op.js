const fs = require('fs');
const content = fs.readFileSync('client/src/pages/OperatorDashboard.jsx', 'utf8');
const lines = content.split(/\r?\n/);

const replacementBlock = `    const [assignedComplaints, setAssignedComplaints] = useState([]);
    const [reviewQueue, setReviewQueue] = useState([]);
    const [escalatedEmergencies, setEscalatedEmergencies] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);

    // Verification State
    const [otpInput, setOtpInput] = useState("");
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetchAssignedComplaints();
        fetchActiveEmergencies();
        fetchReviewQueue();

        // Socket Connection
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ Operator connected to socket');
        });

        socket.on('EMERGENCY_ESCALATED', (data) => {
            console.log('🔥 NEW ESCALATION RECEIVED:', data);

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.error(e));

            // Prevent duplicates (String comparison)
            setEscalatedEmergencies(prev => {
                if (prev.some(e => String(e.id) === String(data.emergencyId))) return prev;
                return [{
                    id: data.emergencyId,
                    timestamp: data.timestamp,
                    isNew: true
                }, ...prev];
            });
        });

        socket.on('EMERGENCY_ACKNOWLEDGED', (data) => {
            console.log('⚠️ NEW ACTIVE ALERT:', data);
            setActiveAlerts(prev => {
                const idToCheck = data.emergencyId || data._id || data.id;
                if (prev.some(e => String(e.id || e._id) === String(idToCheck))) return prev;
                return [{
                    ...data,
                    id: idToCheck,
                    isNew: true
                }, ...prev];
            });
        });

        socket.on('EMERGENCY_RESOLVED', (data) => {
            console.log('✅ EMERGENCY RESOLVED:', data);
            const resolvedId = String(data.emergencyId);

            // Update Active Alerts: Mark as Resolved
            setActiveAlerts(prev => prev.map(a =>
                String(a.id || a._id) === resolvedId
                    ? { ...a, status: 'resolved', isResolvedSuccess: true }
                    : a
            ));

            // Update Modal if open
            setSelectedAlert(prev => {
                if (prev && String(prev.id || prev._id) === resolvedId) {
                    return { ...prev, status: 'resolved', isResolvedSuccess: true };
                }
                return prev;
            });
        });

        return () => {
            socket.disconnect();
        };

    }, []);

    // 🛡️ SAFETY NET: Auto-remove Escalated items if they are Resolved in Active list
    useEffect(() => {
        const resolvedIds = activeAlerts
            .filter(a => a.status === 'resolved' || a.isResolvedSuccess)
            .map(a => String(a.id || a._id));

        if (resolvedIds.length > 0) {
            setEscalatedEmergencies(prev => {
                const newEscalated = prev.filter(e => !resolvedIds.includes(String(e.id)));
                if (newEscalated.length !== prev.length) {
                    return newEscalated;
                }
                return prev;
            });
        }
    }, [activeAlerts]);

    const fetchActiveEmergencies = async () => {
        try {
            const response = await axios.get('/api/emergencies');
            if (response.data.success) {
                const active = response.data.data.filter(e => e.status !== 'resolved');
                setActiveAlerts(active.map(e => ({
                    ...e,
                    id: e._id,
                    timestamp: e.createdAt,
                    acknowledgedBy: 'Admin'
                })));
            }
        } catch (error) {
            console.error('Failed to fetch emergencies:', error);
        }
    };

    const fetchAssignedComplaints = async () => {
        try {
            const response = await axios.get('/api/complaints');
            setAssignedComplaints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewQueue = async () => {
        try {
            const response = await axios.get('/api/complaints/queue/review');
            if (response.data.success) setReviewQueue(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch review queue:', error);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length < 4) return;
        setVerifying(true);
        try {
            const id = selectedAlert.id || selectedAlert._id;
            const res = await axios.post(\`http://localhost:5000/api/emergencies/\${id}/verify\`, { otp: otpInput });

            if (res.data.success) {
                const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
                successAudio.play().catch(e => { });

                const resolvedId = String(id);

                // 1. Force Modal Success State
                setSelectedAlert(prev => ({ ...prev, status: 'resolved', isResolvedSuccess: true }));

                // 2. Mark in Feed (This will trigger the Safety Net Effect to clean Escalations)
                setActiveAlerts(prev => prev.map(a =>
                    String(a.id || a._id) === resolvedId
                        ? { ...a, status: 'resolved', isResolvedSuccess: true }
                        : a
                ));
            }
        } catch (err) {
            console.error(err);
            alert("❌ Verification Failed: " + (err.response?.data?.error || "Invalid OTP"));
            // Modal stays open
        } finally {
            setVerifying(false);
        }
    };`;

const endIdx = lines.findIndex(l => l.includes('const handleLogout'));
const newLines = [...lines.slice(0, 15), replacementBlock, ...lines.slice(endIdx)];

fs.writeFileSync('client/src/pages/OperatorDashboard.jsx', newLines.join('\n'), 'utf8');
console.log('Successfully fixed OperatorDashboard!');

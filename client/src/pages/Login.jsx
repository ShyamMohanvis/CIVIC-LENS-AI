import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Shield, Loader2, AlertCircle, Eye, EyeOff,
    ChevronRight, ArrowLeft, Cpu, Users
} from 'lucide-react';

const QUICK_CREDENTIALS = [
    { role: 'State Admin',      sub: 'Full system access',          id: 'ADMIN001', password: 'Admin@123', badge: 'SA', color: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700' },
    { role: 'Municipal Admin',  sub: 'City-level management',       id: 'ADMIN002', password: 'Admin@123', badge: 'MA', color: 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700' },
    { role: 'Operator',         sub: 'Field operator dashboard',    id: 'EMP001',   password: 'Emp@123',   badge: 'OP', color: 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700' },
    { role: 'Citizen',          sub: 'Report & track complaints',   id: 'CIT001',   password: 'Cit@123',   badge: 'C',  color: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700' },
];

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [quickLoading, setQuickLoading] = useState(null);

    const getDashboardRoute = (userRole) => ({
        'CITIZEN':            '/dashboard/citizen',
        'MUNICIPAL_OPERATOR': '/dashboard/operator',
        'MUNICIPAL_ADMIN':    '/dashboard/admin',
        'STATE_ADMIN':        '/dashboard/state'
    }[userRole] || '/');

    const handleLogin = async (e) => {
        e?.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(employeeId.trim().toUpperCase(), password);
        if (result.success) navigate(getDashboardRoute(result.user.role), { replace: true });
        else setError(result.error);
        setLoading(false);
    };

    const handleQuickLogin = async (cred) => {
        setError('');
        setQuickLoading(cred.id);
        const result = await login(cred.id, cred.password);
        if (result.success) navigate(getDashboardRoute(result.user.role), { replace: true });
        else { setError(result.error); setQuickLoading(null); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 flex items-center justify-center px-4 py-12 relative overflow-hidden">

            {/* Background circles — matches Home hero style */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6">

                {/* ── LEFT — Branding + Quick Boot ── */}
                <div className="flex flex-col justify-between bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">

                    {/* Back link */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-teal-100 hover:text-white text-sm mb-8 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>

                    {/* Logo */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md">
                                <Shield className="w-7 h-7 text-teal-600" />
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-xl tracking-wide">CIVIC LENS</h1>
                                <p className="text-teal-100 text-xs">AI 2.0 — Smart City Platform</p>
                            </div>
                        </div>
                        <p className="text-teal-100 text-sm leading-relaxed">
                            Government-grade civic intelligence. Sign in to access your jurisdiction portal.
                        </p>
                    </div>

                    {/* Quick Boot */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-4 h-4 text-teal-200" />
                            <p className="text-xs font-bold text-teal-200 uppercase tracking-widest">Quick Login — Demo Roles</p>
                        </div>
                        <div className="space-y-2.5">
                            {QUICK_CREDENTIALS.map((cred) => (
                                <button
                                    key={cred.id}
                                    onClick={() => handleQuickLogin(cred)}
                                    disabled={!!quickLoading || loading}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border bg-white transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border ${cred.color}`}>
                                            {cred.badge}
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{cred.role}</p>
                                            <p className="text-xs text-slate-500">{cred.sub}</p>
                                        </div>
                                    </div>
                                    {quickLoading === cred.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-teal-300/70 mt-3 text-center">One-click access for demonstration purposes</p>
                    </div>

                    {/* Control Room shortcut */}
                    <button
                        onClick={() => navigate('/control-room')}
                        className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                        <Cpu className="w-4 h-4" />
                        Open AI Control Room (no login needed)
                    </button>
                </div>

                {/* ── RIGHT — Auth Form ── */}
                <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col justify-center">

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">Sign In</h2>
                        <p className="text-slate-500 text-sm">Enter your Employee or Citizen ID and password.</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-5">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Employee ID */}
                        <div className="space-y-1.5">
                            <label htmlFor="employeeId" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Employee / Citizen ID
                            </label>
                            <input
                                id="employeeId"
                                type="text"
                                placeholder="e.g. ADMIN001, CIT001"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                                required
                                autoComplete="username"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all uppercase"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 hover:-translate-y-0.5 mt-2"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                            ) : (
                                <><Shield className="w-4 h-4" />Sign In to Portal</>
                            )}
                        </button>
                    </form>

                    {/* Stats row */}
                    <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                        {[
                            { v: '1,234+', l: 'Complaints' },
                            { v: '25+',    l: 'Districts' },
                            { v: '98%',    l: 'Satisfaction' },
                        ].map(s => (
                            <div key={s.l}>
                                <p className="text-lg font-bold text-teal-700">{s.v}</p>
                                <p className="text-xs text-slate-500">{s.l}</p>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-4">
                        🔒 Secure Government Authentication System
                    </p>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Shield, User, LogOut, Cpu, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsOpen(false);
    };

    const getDashboardLink = () => {
        if (!user) return '/';
        const dashboardRoutes = {
            'CITIZEN': '/dashboard/citizen',
            'MUNICIPAL_OPERATOR': '/dashboard/operator',
            'MUNICIPAL_ADMIN': '/dashboard/admin',
            'STATE_ADMIN': '/dashboard/state'
        };
        return dashboardRoutes[user.role] || '/';
    };

    const navLinks = [
        { to: "/", label: "Home" },
        { to: "/register", label: "Report Issue" },
        { to: "/track", label: "Track Status" }
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-md">
                            <Shield className="w-6 h-6 text-teal-600" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold text-white tracking-wide">
                                CIVIC LENS
                            </h1>
                            <p className="text-[10px] text-teal-100 -mt-1">
                                AI 2.0 — Smart City Platform
                            </p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="px-3 py-2 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition"
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* 🆕 AI Control Room Link - always visible */}
                        <button
                            onClick={() => navigate('/control-room')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
                        >
                            <Cpu className="w-4 h-4 text-teal-300" />
                            AI Control Room
                        </button>

                        {/* Authentication Section */}
                        {isAuthenticated ? (
                            <>
                                <button
                                    onClick={() => navigate(getDashboardLink())}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition"
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Dashboard
                                </button>

                                {/* User Info */}
                                <div className="flex items-center gap-2 ml-1 px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg">
                                    <User className="w-4 h-4 text-white" />
                                    <span className="text-sm font-medium text-white">{user?.name}</span>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-2 px-5 py-2 ml-2 bg-white text-teal-700 rounded-lg hover:bg-teal-50 transition shadow-md font-medium text-sm border-none"
                            >
                                <Shield className="w-4 h-4" />
                                Login
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isOpen && (
                <div className="lg:hidden bg-teal-800 border-t border-teal-600">
                    <div className="px-4 py-4 space-y-2">
                        {navLinks.map(link => (
                            <Link 
                                key={link.to} 
                                to={link.to} 
                                onClick={() => setIsOpen(false)} 
                                className="block px-4 py-3 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition"
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* AI Control Room mobile link */}
                        <button
                            onClick={() => { setIsOpen(false); navigate('/control-room'); }}
                            className="w-full flex items-center justify-start gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-teal-900/50 border border-teal-600/40 text-teal-100 hover:bg-teal-800/50 transition border-none text-left"
                        >
                            <Cpu className="w-4 h-4" />
                            🧠 AI Control Room
                        </button>

                        {isAuthenticated ? (
                            <>
                                <button onClick={() => { setIsOpen(false); navigate(getDashboardLink()); }} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition">Dashboard</button>

                                <div className="pt-3 mt-3 border-t border-teal-600">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-white/20 rounded-lg mb-3">
                                        <User className="w-5 h-5 text-white" />
                                        <div>
                                            <p className="text-sm font-medium text-white">{user?.name}</p>
                                            <p className="text-xs text-teal-100">{user?.role?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => { setIsOpen(false); navigate('/login'); }}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-teal-700 rounded-lg border-none hover:bg-teal-50 transition shadow-md font-medium"
                            >
                                <Shield className="w-4 h-4" />
                                Login
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

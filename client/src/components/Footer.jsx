import { Link } from "react-router-dom";
import {
    Shield,
    Mail,
    Phone,
    MapPin,
    Facebook,
    Twitter,
    Instagram,
    Youtube,
    ExternalLink
} from "lucide-react";

export default function Footer() {
    const quickLinks = [
        { label: "Register Complaint", path: "/register" },
        { label: "Track Status", path: "/track" },
        { label: "Voice Report", path: "/voice" },
        { label: "Emergency SOS", path: "/sos" },
    ];

    const aboutLinks = [
        { label: "About Us", path: "#about" },
        { label: "How It Works", path: "#how-it-works" },
        { label: "Privacy Policy", path: "#" },
        { label: "Terms of Service", path: "#" },
    ];

    const socialLinks = [
        { icon: Facebook, href: "#", label: "Facebook" },
        { icon: Twitter, href: "#", label: "Twitter" },
        { icon: Instagram, href: "#", label: "Instagram" },
        { icon: Youtube, href: "#", label: "YouTube" },
    ];

    return (
        <footer className="bg-gradient-to-b from-slate-800 to-slate-900 text-white">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Brand Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 bg-teal-600 rounded-lg">
                                <Shield className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">CIVIC LENS</h2>
                                <p className="text-xs text-slate-400">AI-Powered Civic Portal</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Generation-5 AI platform for zero-typing civic complaint management
                            with trust scoring, risk assessment, and intelligent municipal governance.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 pt-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-teal-600 rounded-lg transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-teal-400" />
                            Quick Links
                        </h3>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        to={link.path}
                                        className="text-sm text-slate-300 hover:text-teal-400 transition-colors flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* About Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">About</h3>
                        <ul className="space-y-3">
                            {aboutLinks.map((link) => (
                                <li key={link.path}>
                                    <a
                                        href={link.path}
                                        className="text-sm text-slate-300 hover:text-teal-400 transition-colors flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-300">
                                    Municipal Corporation Office,<br />
                                    Central Zone, New Delhi - 110001
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-teal-400" />
                                <span className="text-sm text-slate-300">1800-XXX-XXXX (Toll Free)</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-teal-400" />
                                <span className="text-sm text-slate-300">support@civiclens.gov.in</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-slate-400 text-center md:text-left">
                            © 2026 CIVIC LENS. All Rights Reserved. | Swachh Bharat Mission Compatible
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs text-slate-300">System Online</span>
                            </div>
                            <span className="text-xs text-slate-500">v5.0 Gen-5 AI</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

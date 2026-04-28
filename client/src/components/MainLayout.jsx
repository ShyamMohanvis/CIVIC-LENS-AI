import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingSOSButton from "./FloatingSOSButton";
import EmergencyNotifications from "./EmergencyNotifications";

export default function MainLayout({ hideNavbar = false, hideFooter = false, hideFloatingSOS = false }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {!hideNavbar && <Navbar />}
            
            {/* 
                Centralized padding to ensure content isn't hidden behind the fixed Navbar.
                We apply flex-1 to push the footer to the bottom of the screen.
            */}
            <main className={`flex-1 flex flex-col ${!hideNavbar ? 'pt-16' : ''}`}>
                <Outlet />
            </main>

            {!hideFooter && <Footer />}
            
            {!hideFloatingSOS && <FloatingSOSButton />}
            <EmergencyNotifications />
        </div>
    );
}

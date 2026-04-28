import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login but save the location they were trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has required role
    if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
            // User doesn't have permission for this route
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center max-w-md">
                        <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
                        <p className="text-slate-600 mb-6">
                            You don't have permission to access this page.
                        </p>
                        <p className="text-sm text-slate-500">
                            Your role: <span className="font-semibold text-slate-700">{user.role}</span>
                            <br />
                            Required roles: <span className="font-semibold text-slate-700">{allowedRoles.join(', ')}</span>
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }
    }

    return children;
}

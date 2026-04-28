import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterComplaint from './pages/RegisterComplaint';
import TrackComplaint from './pages/TrackComplaint';
import SOS from './pages/SOS';
import VoiceReport from './pages/VoiceReport';
import EmergencyDashboard from './pages/EmergencyDashboard';
import Admin from './pages/Admin';
import ControlRoom from './pages/ControlRoom';

// Role-Specific Dashboards
import CitizenDashboard from './pages/CitizenDashboard';
import AppealCenter from './pages/AppealCenter';
import OperatorDashboard from './pages/OperatorDashboard';
import MunicipalAdminDashboard from './pages/MunicipalAdminDashboard';
import StateAdminDashboard from './pages/StateAdminDashboard';

// Components
import MainLayout from './components/MainLayout';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* IMMERSIVE ROUTES (No Navbar, Footer, or SOS to allow 100vh HUD/Gateway) */}
        <Route element={<MainLayout hideNavbar={true} hideFooter={true} hideFloatingSOS={true} />}>
          <Route path="/register" element={<RegisterComplaint />} />
          <Route path="/login" element={<Login />} />
          <Route path="/control-room" element={<ControlRoom />} />
        </Route>

        <Route element={<MainLayout />}>
          {/* PUBLIC ROUTES - No login required */}
          <Route path="/" element={<Home />} />
          <Route path="/track" element={<TrackComplaint />} />
          <Route path="/sos" element={<SOS />} />
          <Route path="/voice" element={<VoiceReport />} />

          {/* ADMIN PORTAL - Public for demo (should be protected in production) */}
          <Route path="/admin" element={<Admin />} />

          {/* CITIZEN DASHBOARD - Login required to see all complaints */}
          <Route
            path="/dashboard/citizen"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/appeal"
            element={
              <ProtectedRoute allowedRoles={['CITIZEN']}>
                <AppealCenter />
              </ProtectedRoute>
            }
          />

          {/* MUNICIPAL OPERATOR ROUTES - Login required */}
          <Route
            path="/dashboard/operator"
            element={
              <ProtectedRoute allowedRoles={['MUNICIPAL_OPERATOR']}>
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* MUNICIPAL ADMIN ROUTES - Login required */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['MUNICIPAL_ADMIN']}>
                <MunicipalAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency-dashboard"
            element={
              <ProtectedRoute allowedRoles={['MUNICIPAL_ADMIN', 'STATE_ADMIN']}>
                <EmergencyDashboard />
              </ProtectedRoute>
            }
          />

          {/* STATE ADMIN ROUTES - Login required */}
          <Route
            path="/dashboard/state"
            element={
              <ProtectedRoute allowedRoles={['STATE_ADMIN']}>
                <StateAdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import GuestRoute from './components/GuestRoute.jsx';
import LoginRegister from './pages/LoginRegister.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Role Guard for manual URL path redirection/protection
const RoleDashboardRedirect = ({ allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== allowedRole) {
    // Graceful redirection to the user's authentic dashboard query parameter view
    return <Navigate to="/dashboard" replace />;
  }
  return <Dashboard />;
};

export const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* GUEST ROUTES (Block authenticated users from returning to login/reset) */}
            <Route element={<GuestRoute />}>
              <Route path="/" element={<LoginRegister />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
            </Route>

            {/* PROTECTED ROUTES (Block guest access, auto-redirect to login) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cashier/dashboard" element={<RoleDashboardRedirect allowedRole="CASHIER" />} />
              <Route path="/admin/dashboard" element={<RoleDashboardRedirect allowedRole="ADMIN" />} />
              <Route path="/superadmin/dashboard" element={<RoleDashboardRedirect allowedRole="SUPER_ADMIN" />} />
            </Route>

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;

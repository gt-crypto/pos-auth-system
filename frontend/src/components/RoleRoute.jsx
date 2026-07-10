import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const RoleRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-6 z-50 relative">
        <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-slate-200/80 shadow-xl text-center flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display">403 Access Denied</h1>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              You do not have the required permissions to view this resource. Please contact your system administrator.
            </p>
          </div>
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm transition-all duration-200 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleRoute;

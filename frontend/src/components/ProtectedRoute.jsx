import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
  const { user, loading, checkSession, logout } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const validatingRef = useRef(false);
  const location = useLocation();

  // 1. Cross-tab logout listener using storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        logout();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [logout]);

  // 2. Active Session Re-validation on Route Change & Tab Focus
  useEffect(() => {
    let active = true;
    const validate = async () => {
      if (!user) return;
      if (validatingRef.current) return;
      
      validatingRef.current = true;
      setIsValidating(true);
      try {
        await checkSession();
      } catch {
        // If checkSession failed, AuthContext will handle state purging
      } finally {
        validatingRef.current = false;
        if (active) setIsValidating(false);
      }
    };

    validate();

    // Re-validate when tab gains focus
    const handleFocus = () => {
      validate();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname, checkSession]); // Enforces verification strictly on route changes, removing infinite state loops

  const showBlockingLoader = loading && !user;

  if (showBlockingLoader) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-slate-500">Verifying session security...</p>
      </div>
    );
  }

  if (isValidating && !user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-slate-500">Verifying session security...</p>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;

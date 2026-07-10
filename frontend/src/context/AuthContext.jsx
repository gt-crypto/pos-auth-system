import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export const AuthContext = createContext(null);

const AUTH_SESSION_KEY = 'apexify-auth-session-active';
const REMEMBER_AUTH_KEY = 'apexify-auth-remembered';

const hasClientSessionMarker = () => {
  try {
    return (
      sessionStorage.getItem(AUTH_SESSION_KEY) === 'true' ||
      localStorage.getItem(REMEMBER_AUTH_KEY) === 'true'
    );
  } catch {
    return false;
  }
};

const markClientSession = (rememberMe = false) => {
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    if (rememberMe) {
      localStorage.setItem(REMEMBER_AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_AUTH_KEY);
    }
  } catch {
    // Storage can be unavailable in private or restricted browser modes.
  }
};

const clearClientSession = () => {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(REMEMBER_AUTH_KEY);
  } catch {
    // Storage cleanup is best-effort; the server cookie is still cleared.
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user session
  const checkSession = useCallback(async () => {
    if (!hasClientSessionMarker()) {
      setUser(null);
      setLoading(false);
      api.post('/auth/logout').catch(() => {
        // Ignore network failures while clearing a stale startup cookie.
      });
      return;
    }

    try {
      const response = await api.get('/auth/me', { timeout: 2500 });
      if (response.data?.success) {
        setUser(response.data.data.user);
      } else {
        clearClientSession();
        setUser(null);
      }
    } catch (error) {
      clearClientSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login handler
  const login = async (username, password, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login', { username, password, rememberMe });
      if (response.data?.success) {
        markClientSession(rememberMe);
        setUser(response.data.data.user);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      clearClientSession();
      // Synchronize logout event across all open browser tabs
      localStorage.setItem('logout-event', Date.now().toString());
      // Hard redirect to clear browser caches and memory states
      window.location.href = '/';
    }
  };

  // Forgot password requester
  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Reset password modifier
  const resetPassword = async (token, password, confirmPassword) => {
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password, confirmPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Change password modifier
  const changePassword = async (oldPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/change-password', { oldPassword, newPassword, confirmPassword });
      if (response.data?.success) {
        // Since password change invalidates all tokens, clear local user state
        clearClientSession();
        setUser(null);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // On mount, run checkSession automatically
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      checkSession,
      forgotPassword,
      resetPassword,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

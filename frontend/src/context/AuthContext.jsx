import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from '../hooks/useToast.js';

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
  const navigate = useNavigate();
  const { showToast } = useToast();

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

    let hasAttemptedRetry = false;

    const attemptFetch = async () => {
      try {
        const response = await api.get('/auth/me', { timeout: 10000 });
        if (response.data?.success) {
          setUser(response.data.data.user);
          markClientSession(localStorage.getItem(REMEMBER_AUTH_KEY) === 'true');
          return true;
        }
        setUser(null);
        clearClientSession();
        return false;
      } catch (error) {
        const isNetworkOr5xx = error.isNetworkError || (error.status >= 502 && error.status <= 504);

        if (isNetworkOr5xx && !hasAttemptedRetry) {
          hasAttemptedRetry = true;
          // Wait 1.5 seconds before retrying once
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return attemptFetch();
        }

        // Definitive auth error or retry failed:
        if (error.status === 401 || error.status === 403) {
          setUser(null);
          clearClientSession();
        } else if (isNetworkOr5xx) {
          setUser(null);
          clearClientSession();
          showToast('Unable to connect to the authentication server. Please check your network connection.', 'error');
        } else {
          // Other client/bad-request errors
          setUser(null);
          clearClientSession();
        }
        return false;
      }
    };

    setLoading(true);
    await attemptFetch();
    setLoading(false);
  }, [showToast]);

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
      try {
        localStorage.setItem('logout-event', Date.now().toString());
        setTimeout(() => {
          try {
            localStorage.removeItem('logout-event');
          } catch (e) {}
        }, 1000);
      } catch (e) {}
      navigate('/', { replace: true });
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

  // Synchronize cross-tab logout
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'logout-event' && event.newValue) {
        if (user) {
          setUser(null);
          clearClientSession();
          navigate('/', { replace: true });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, navigate]);

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

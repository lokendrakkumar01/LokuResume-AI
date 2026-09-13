import React, { createContext, useState, useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import config from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const formatErrorMessage = (detail, fallback) => {
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) {
            return detail.map(err => err.msg || JSON.stringify(err)).join(', ');
      }
      if (detail && typeof detail === 'object') {
            return detail.msg || JSON.stringify(detail);
      }
      return fallback;
};

export const AuthProvider = ({ children }) => {
      const [token, setToken] = useState(() => localStorage.getItem('token') || null);
      const [user, setUser] = useState(() => {
            try {
                  const saved = localStorage.getItem('user');
                  return saved ? JSON.parse(saved) : null;
            } catch (e) {
                  return null;
            }
      });
      const [loading, setLoading] = useState(true);

      // Verify token on mount if present
      useEffect(() => {
            let isMounted = true;

            const verifySession = async () => {
                  const storedToken = localStorage.getItem('token');
                  if (!storedToken) {
                        if (isMounted) setLoading(false);
                        return;
                  }

                  try {
                        const response = await axios.get(`${config.API_BASE_URL}/auth/me`, {
                              headers: { Authorization: `Bearer ${storedToken}` }
                        });
                        if (isMounted && response.data) {
                              setUser(response.data);
                              localStorage.setItem('user', JSON.stringify(response.data));
                        }
                  } catch (err) {
                        // If token is invalid or expired (401), clear session
                        if (err.response && err.response.status === 401) {
                              if (isMounted) {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    setToken(null);
                                    setUser(null);
                              }
                        }
                        // If network error (offline / cold start), keep saved local user
                  } finally {
                        if (isMounted) setLoading(false);
                  }
            };

            verifySession();

            return () => {
                  isMounted = false;
            };
      }, []);

      // Axios interceptor to catch any 401 Unauthorized across API requests
      useEffect(() => {
            const interceptor = axios.interceptors.response.use(
                  (response) => response,
                  (error) => {
                        if (error.response && error.response.status === 401) {
                              localStorage.removeItem('token');
                              localStorage.removeItem('user');
                              setToken(null);
                              setUser(null);
                        }
                        return Promise.reject(error);
                  }
            );

            return () => axios.interceptors.response.eject(interceptor);
      }, []);

      const login = async (email, password) => {
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/auth/login`, {
                        email: email.trim().toLowerCase(),
                        password
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));

                  // Set session trigger for AI Voice & Chat Onboarding Guide
                  sessionStorage.setItem('loku_ai_guide_trigger', JSON.stringify({ name: userData.name, action: 'login', timestamp: Date.now() }));
                  window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: userData.name, action: 'login' } }));

                  setToken(access_token);
                  setUser(userData);

                  return { success: true, user: userData };
            } catch (error) {
                  return {
                        success: false,
                        error: formatErrorMessage(error.response?.data?.detail, 'Login failed')
                  };
            }
      };

      const signup = async (name, email, password) => {
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/auth/signup`, {
                        name: name.trim(),
                        email: email.trim().toLowerCase(),
                        password
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));

                  // Set session trigger for AI Voice & Chat Onboarding Guide
                  sessionStorage.setItem('loku_ai_guide_trigger', JSON.stringify({ name: userData.name, action: 'signup', timestamp: Date.now() }));
                  window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: userData.name, action: 'signup' } }));

                  setToken(access_token);
                  setUser(userData);

                  return { success: true, user: userData };
            } catch (error) {
                  return {
                        success: false,
                        error: formatErrorMessage(error.response?.data?.detail, 'Signup failed')
                  };
            }
      };

      const adminLogin = async (email, password) => {
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/auth/admin-login`, {
                        email: email.trim().toLowerCase(),
                        password
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));

                  setToken(access_token);
                  setUser(userData);

                  return { success: true, user: userData };
            } catch (error) {
                  return {
                        success: false,
                        error: formatErrorMessage(error.response?.data?.detail, 'Admin authentication failed')
                  };
            }
      };

      const logout = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
      };

      const adminLogout = () => {
            logout();
      };

      const getAuthHeader = () => {
            return token ? { Authorization: `Bearer ${token}` } : {};
      };

      const isAdmin = Boolean(user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator'));

      return (
            <AuthContext.Provider value={{ user, token, login, signup, logout, adminLogin, adminLogout, isAdmin, getAuthHeader, loading }}>
                  {children}
            </AuthContext.Provider>
      );
};

export const ProtectedRoute = ({ children }) => {
      const { token, loading } = useAuth();

      if (loading) {
            return (
                  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
            );
      }

      if (!token) {
            return <Navigate to="/login" replace />;
      }

      return children;
};

export const GuestRoute = ({ children }) => {
      const { token, loading } = useAuth();

      if (loading) {
            return (
                  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
            );
      }

      // If user is already logged in, redirect directly to dashboard
      if (token) {
            return <Navigate to="/dashboard" replace />;
      }

      return children;
};

export const AdminRoute = ({ children }) => {
      const { token, user, loading } = useAuth();

      if (loading) {
            return (
                  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#f43f5e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
            );
      }

      if (!token) {
            return <Navigate to="/admin/login" replace />;
      }

      const isPrivileged = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator');
      if (!isPrivileged) {
            return <Navigate to="/dashboard" replace />;
      }

      return children;
};

export const AdminGuestRoute = ({ children }) => {
      const { token, user, loading } = useAuth();

      if (loading) {
            return (
                  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#f43f5e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
            );
      }

      const isPrivileged = token && user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator');
      if (isPrivileged) {
            return <Navigate to="/admin" replace />;
      }

      return children;
};

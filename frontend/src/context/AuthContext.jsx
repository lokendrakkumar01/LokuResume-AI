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

// Helper to inspect if JWT token is expired on the client side
const isTokenExpired = (tokenStr) => {
      if (!tokenStr) return true;
      try {
            const parts = tokenStr.split('.');
            if (parts.length !== 3) return false;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload && payload.exp) {
                  // Expired if current time is past exp timestamp (with 60s buffer)
                  return Date.now() >= (payload.exp * 1000) - 60000;
            }
            return false;
      } catch (e) {
            return false;
      }
};

export const AuthProvider = ({ children }) => {
      const [token, setToken] = useState(() => {
            const savedToken = localStorage.getItem('token');
            if (savedToken && isTokenExpired(savedToken)) {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  return null;
            }
            return savedToken || null;
      });

      const [user, setUser] = useState(() => {
            try {
                  const saved = localStorage.getItem('user');
                  return saved ? JSON.parse(saved) : null;
            } catch (e) {
                  return null;
            }
      });

      const [studentTrack, setStudentTrackState] = useState(() => {
            const saved = localStorage.getItem('student_track');
            if (saved === 'business' || saved === 'tech') return saved;
            try {
                  const savedUser = localStorage.getItem('user');
                  if (savedUser) {
                        const parsed = JSON.parse(savedUser);
                        if (parsed.track) return parsed.track;
                  }
            } catch (e) {}
            return 'tech';
      });

      const setStudentTrack = async (newTrack) => {
            const clean = (newTrack || 'tech').toLowerCase() === 'business' ? 'business' : 'tech';
            setStudentTrackState(clean);
            localStorage.setItem('student_track', clean);
            if (user) {
                  const updatedUser = { ...user, track: clean };
                  setUser(updatedUser);
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  if (token) {
                        try {
                              await axios.put(`${config.API_BASE_URL}/auth/track`, { track: clean }, {
                                    headers: { Authorization: `Bearer ${token}` },
                                    timeout: 5000
                              });
                        } catch (e) {
                              // silent
                        }
                  }
            }
      };

      // Never block rendering if user credentials are already present in localStorage!
      const [loading, setLoading] = useState(false);

      // Non-blocking silent token verification in the background (stale-while-revalidate)
      useEffect(() => {
            let isMounted = true;

            const verifySession = async () => {
                  const storedToken = localStorage.getItem('token');
                  if (!storedToken) return;

                  if (isTokenExpired(storedToken)) {
                        if (isMounted) {
                              localStorage.removeItem('token');
                              localStorage.removeItem('user');
                              setToken(null);
                              setUser(null);
                        }
                        return;
                  }

                  try {
                        // Fast 10-second timeout so backend cold-starts don't hang requests indefinitely
                        const response = await axios.get(`${config.API_BASE_URL}/auth/me`, {
                              headers: { Authorization: `Bearer ${storedToken}` },
                              timeout: 10000
                        });
                        if (isMounted && response.data) {
                              setUser(response.data);
                              localStorage.setItem('user', JSON.stringify(response.data));
                              if (response.data.track) {
                                    setStudentTrackState(response.data.track);
                                    localStorage.setItem('student_track', response.data.track);
                              }
                        }
                  } catch (err) {
                        // Only wipe local session if backend explicitly replied 401 Unauthorized
                        if (err.response && err.response.status === 401) {
                              if (isMounted) {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    setToken(null);
                                    setUser(null);
                              }
                        }
                        // On cold start delay, network blip, or 500/timeout, DO NOT logout!
                        // User continues seamlessly with their cached profile.
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
                  if (userData.track) {
                        setStudentTrackState(userData.track);
                        localStorage.setItem('student_track', userData.track);
                  }

                  // Set session trigger for AI Voice & Chat Onboarding Guide
                  sessionStorage.setItem('loku_ai_guide_trigger', JSON.stringify({ name: userData.name, action: 'login', track: userData.track || studentTrack, timestamp: Date.now() }));
                  window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: userData.name, action: 'login', track: userData.track || studentTrack } }));

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

      const signup = async (name, email, password, trackChoice) => {
            try {
                  const selectedTrack = trackChoice || studentTrack || 'tech';
                  const response = await axios.post(`${config.API_BASE_URL}/auth/signup`, {
                        name: name.trim(),
                        email: email.trim().toLowerCase(),
                        password,
                        track: selectedTrack
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));
                  setStudentTrackState(selectedTrack);
                  localStorage.setItem('student_track', selectedTrack);

                  // Set session trigger for AI Voice & Chat Onboarding Guide
                  sessionStorage.setItem('loku_ai_guide_trigger', JSON.stringify({ name: userData.name, action: 'signup', track: selectedTrack, timestamp: Date.now() }));
                  window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: userData.name, action: 'signup', track: selectedTrack } }));

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
            <AuthContext.Provider value={{ user, token, login, signup, logout, adminLogin, adminLogout, isAdmin, getAuthHeader, loading, studentTrack, setStudentTrack }}>
                  {children}
            </AuthContext.Provider>
      );
};

export const ProtectedRoute = ({ children }) => {
      const { token, loading } = useAuth();

      // Only show spinner if loading and no token exists
      if (loading && !token) {
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

      if (loading && !token) {
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

      if (loading && !token) {
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

      if (loading && !token) {
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

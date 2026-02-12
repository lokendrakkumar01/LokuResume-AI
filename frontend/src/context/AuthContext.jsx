import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
      const [user, setUser] = useState(null);
      const [token, setToken] = useState(localStorage.getItem('token'));
      const [loading, setLoading] = useState(true);

      useEffect(() => {
            const savedUser = localStorage.getItem('user');
            if (savedUser && token) {
                  setUser(JSON.parse(savedUser));
            }
            setLoading(false);
      }, [token]);

      const login = async (email, password) => {
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/auth/login`, {
                        email,
                        password
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));

                  setToken(access_token);
                  setUser(userData);

                  return { success: true };
            } catch (error) {
                  return {
                        success: false,
                        error: error.response?.data?.detail || 'Login failed'
                  };
            }
      };

      const signup = async (name, email, password) => {
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/auth/signup`, {
                        name,
                        email,
                        password
                  });

                  const { access_token, user: userData } = response.data;

                  localStorage.setItem('token', access_token);
                  localStorage.setItem('user', JSON.stringify(userData));

                  setToken(access_token);
                  setUser(userData);

                  return { success: true };
            } catch (error) {
                  return {
                        success: false,
                        error: error.response?.data?.detail || 'Signup failed'
                  };
            }
      };

      const logout = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
      };

      const getAuthHeader = () => {
            return token ? { Authorization: `Bearer ${token}` } : {};
      };

      return (
            <AuthContext.Provider value={{ user, token, login, signup, logout, getAuthHeader, loading }}>
                  {children}
            </AuthContext.Provider>
      );
};

export const ProtectedRoute = ({ children }) => {
      const { token, loading } = useAuth();

      if (loading) {
            return <div className="loading">Loading...</div>;
      }

      if (!token) {
            window.location.href = '/login';
            return null;
      }

      return children;
};

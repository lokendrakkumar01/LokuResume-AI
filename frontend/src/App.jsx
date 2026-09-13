import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, GuestRoute } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ThemeToggle from './components/ThemeToggle';
import AIChatAssistant from './components/AIChatAssistant';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import Landing from './pages/Landing';
import axios from 'axios';
import config from './config';
import './index.css';

function App() {
  // Pre-warm backend on initial load to ensure instant 1-second responses
  useEffect(() => {
    try {
      axios.get(`${config.API_BASE_URL}/health`).catch(() => {});
    } catch (e) {
      // safe ignore
    }
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <ThemeToggle />
            <AIChatAssistant />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <Login />
                  </GuestRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <GuestRoute>
                    <Signup />
                  </GuestRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume/create"
                element={
                  <ProtectedRoute>
                    <ResumeBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume/edit/:id"
                element={
                  <ProtectedRoute>
                    <ResumeBuilder />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

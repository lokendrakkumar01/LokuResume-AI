import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import config from '../config';
import '../styles/Auth.css';

// Professional SVG Icons
const SparkleLogoIcon = () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e11d48' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
);

const TechStudentIcon = () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
);

const BusinessStudentIcon = () => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
);

const AlertIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
);

const ShieldCheckIcon = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
      </svg>
);

const MailIcon = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
      </svg>
);

const LockIcon = () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
);

const EyeIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
      </svg>
);

const EyeOffIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
            <line x1="2" y1="2" x2="22" y2="22"></line>
      </svg>
);

function Login() {
      const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
      const [password, setPassword] = useState('');
      const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
      const [showPassword, setShowPassword] = useState(false);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const { login, token, studentTrack, setStudentTrack } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      useEffect(() => {
            if (token) {
                  navigate('/dashboard', { replace: true });
            }
      }, [token, navigate]);

      // Greet user with AI Voice asking for Stream & Language when landing on auth portal
      useEffect(() => {
            const timer = setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('trigger-stream-welcome', {
                        detail: { track: studentTrack || 'tech' }
                  }));
            }, 800);
            return () => clearTimeout(timer);
      }, [studentTrack]);

      const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');

            const cleanEmail = email.trim();
            if (!cleanEmail || !password) {
                  setError('Please fill in all fields');
                  return;
            }

            setLoading(true);

            if (rememberMe) {
                  localStorage.setItem('remember_me', 'true');
                  localStorage.setItem('remembered_email', cleanEmail);
            } else {
                  localStorage.removeItem('remember_me');
                  localStorage.removeItem('remembered_email');
            }

            const result = await login(cleanEmail, password);

            if (result.success) {
                  showToast('Welcome back!', 'success');
                  navigate('/dashboard', { replace: true });
            } else {
                  setError(result.error);
                  showToast(result.error, 'error');
                  setLoading(false);
            }
      };

      return (
            <div className="auth-container">
                  <div className="auth-orb auth-orb-1"></div>
                  <div className="auth-orb auth-orb-2"></div>

                  <div className="auth-card">
                        <div className="auth-header">
                              <div className="auth-brand-logo">
                                    <SparkleLogoIcon />
                                    <span>{config.APP_NAME}</span>
                              </div>
                              <p className="auth-tagline">{config.TAGLINE}</p>
                        </div>

                        <h2 className="auth-title">Welcome Back</h2>

                        {/* Student Stream Selection Badge */}
                        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px', fontWeight: 600 }}>
                                    Choose your Academic &amp; Career Stream:
                              </p>
                              <div className="auth-stream-pill-box">
                                    <button
                                          type="button"
                                          onClick={() => setStudentTrack('tech')}
                                          style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontSize: '0.84rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                background: studentTrack === 'tech' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                                                color: studentTrack === 'tech' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
                                          }}
                                    >
                                          <TechStudentIcon />
                                          <span>Tech Student</span>
                                    </button>
                                    <button
                                          type="button"
                                          onClick={() => setStudentTrack('business')}
                                          style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontSize: '0.84rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                background: studentTrack === 'business' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                                                color: studentTrack === 'business' ? '#ffffff' : 'var(--text-secondary, #94a3b8)'
                                          }}
                                    >
                                          <BusinessStudentIcon />
                                          <span>Business Student</span>
                                    </button>
                              </div>
                        </div>

                        {error && (
                              <div className="error-message">
                                    <AlertIcon />
                                    <span>{error}</span>
                              </div>
                        )}

                        <form onSubmit={handleSubmit} className="auth-form">
                              <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <div className="input-icon-wrapper">
                                          <span className="input-icon"><MailIcon /></span>
                                          <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="your@email.com"
                                          />
                                    </div>
                              </div>

                              <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <div className="input-icon-wrapper">
                                          <span className="input-icon"><LockIcon /></span>
                                          <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                minLength={6}
                                          />
                                          <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowPassword(!showPassword)}
                                                title={showPassword ? 'Hide Password' : 'Show Password'}
                                                aria-label="Toggle Password Visibility"
                                          >
                                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                          </button>
                                    </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary, #cbd5e1)', userSelect: 'none' }}>
                                          <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                style={{ accentColor: '#e11d48', width: '16px', height: '16px', cursor: 'pointer' }}
                                          />
                                          Keep me signed in
                                    </label>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.8rem' }}>
                                          <ShieldCheckIcon />
                                          <span>Instant Access</span>
                                    </span>
                              </div>

                              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? 'Signing In...' : 'Sign In'}
                              </button>
                        </form>

                        <p className="auth-footer">
                              Don't have an account? <Link to="/signup">Create One</Link>
                        </p>

                        <div style={{ textAlign: 'center' }}>
                              <Link to="/" className="back-home-link">← Back to Home</Link>
                        </div>
                  </div>
            </div>
      );
}

export default Login;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import config from '../config';
import '../styles/Auth.css';

function Login() {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const { login, token } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      useEffect(() => {
            if (token) {
                  navigate('/dashboard', { replace: true });
            }
      }, [token, navigate]);

      const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');

            const cleanEmail = email.trim();
            if (!cleanEmail || !password) {
                  setError('Please fill in all fields');
                  return;
            }

            setLoading(true);

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
                                    <span>✨</span> {config.APP_NAME}
                              </div>
                              <p className="auth-tagline">{config.TAGLINE}</p>
                        </div>

                        <h2 className="auth-title">Welcome Back</h2>

                        {error && <div className="error-message">⚠️ {error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form">
                              <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <div className="input-icon-wrapper">
                                          <span className="input-icon">✉️</span>
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
                                          <span className="input-icon">🔒</span>
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
                                          >
                                                {showPassword ? '🙈' : '👁️'}
                                          </button>
                                    </div>
                              </div>

                              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? 'Logging in...' : 'Sign In'}
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

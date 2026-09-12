import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import config from '../config';
import '../styles/Auth.css';

function Signup() {
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const { signup, token } = useAuth();
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

            const cleanName = name.trim();
            const cleanEmail = email.trim();

            if (!cleanName || !cleanEmail || !password) {
                  const msg = 'Please fill in all fields';
                  setError(msg);
                  showToast(msg, 'warning');
                  return;
            }

            if (password !== confirmPassword) {
                  const msg = 'Passwords do not match';
                  setError(msg);
                  showToast(msg, 'warning');
                  return;
            }

            if (password.length < 6) {
                  const msg = 'Password must be at least 6 characters';
                  setError(msg);
                  showToast(msg, 'warning');
                  return;
            }

            setLoading(true);

            const result = await signup(cleanName, cleanEmail, password);

            if (result.success) {
                  showToast('Account created successfully!', 'success');
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

                        <h2 className="auth-title">Create Account</h2>

                        {error && <div className="error-message">⚠️ {error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form">
                              <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <div className="input-icon-wrapper">
                                          <span className="input-icon">👤</span>
                                          <input
                                                type="text"
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="John Doe"
                                          />
                                    </div>
                              </div>

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

                              <div className="form-group">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <div className="input-icon-wrapper">
                                          <span className="input-icon">🔒</span>
                                          <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                minLength={6}
                                          />
                                    </div>
                              </div>

                              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? 'Creating account...' : 'Create Account'}
                              </button>
                        </form>

                        <p className="auth-footer">
                              Already have an account? <Link to="/login">Sign In</Link>
                        </p>

                        <div style={{ textAlign: 'center' }}>
                              <Link to="/" className="back-home-link">← Back to Home</Link>
                        </div>
                  </div>
            </div>
      );
}

export default Signup;

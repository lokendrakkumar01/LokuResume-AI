import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import '../styles/Auth.css';

function Signup() {
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [confirmPassword, setConfirmPassword] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const { signup } = useAuth();
      const navigate = useNavigate();

      const handleSubmit = async (e) => {
            e.preventDefault();
            setError('');

            if (password !== confirmPassword) {
                  setError('Passwords do not match');
                  return;
            }

            if (password.length < 6) {
                  setError('Password must be at least 6 characters');
                  return;
            }

            setLoading(true);

            const result = await signup(name, email, password);

            if (result.success) {
                  navigate('/dashboard');
            } else {
                  setError(result.error);
                  setLoading(false);
            }
      };

      return (
            <div className="auth-container">
                  <div className="auth-card">
                        <div className="auth-header">
                              <h1>{config.APP_NAME}</h1>
                              <p>{config.TAGLINE}</p>
                        </div>

                        <h2>Create Account</h2>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleSubmit} className="auth-form">
                              <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                          type="text"
                                          id="name"
                                          value={name}
                                          onChange={(e) => setName(e.target.value)}
                                          required
                                          placeholder="John Doe"
                                    />
                              </div>

                              <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                          type="email"
                                          id="email"
                                          value={email}
                                          onChange={(e) => setEmail(e.target.value)}
                                          required
                                          placeholder="your@email.com"
                                    />
                              </div>

                              <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <input
                                          type="password"
                                          id="password"
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          required
                                          placeholder="••••••••"
                                          minLength={6}
                                    />
                              </div>

                              <div className="form-group">
                                    <label htmlFor="confirmPassword">Confirm Password</label>
                                    <input
                                          type="password"
                                          id="confirmPassword"
                                          value={confirmPassword}
                                          onChange={(e) => setConfirmPassword(e.target.value)}
                                          required
                                          placeholder="••••••••"
                                          minLength={6}
                                    />
                              </div>

                              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                                    {loading ? 'Creating account...' : 'Sign Up'}
                              </button>
                        </form>

                        <p className="auth-footer">
                              Already have an account? <Link to="/login">Login</Link>
                        </p>

                        <p className="auth-footer">
                              <Link to="/">← Back to Home</Link>
                        </p>
                  </div>
            </div>
      );
}

export default Signup;

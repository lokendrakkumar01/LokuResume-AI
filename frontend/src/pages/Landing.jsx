import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import '../styles/Landing.css';

function Landing() {
      const { user } = useAuth();

      return (
            <div className="landing">
                  <nav className="nav">
                        <div className="nav-brand">
                              <h2>{config.APP_NAME}</h2>
                        </div>
                        <div className="nav-links">
                              {user ? (
                                    <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
                              ) : (
                                    <>
                                          <Link to="/login" className="btn btn-secondary">Login</Link>
                                          <Link to="/signup" className="btn btn-primary">Get Started</Link>
                                    </>
                              )}
                        </div>
                  </nav>

                  <section className="hero">
                        <div className="hero-content">
                              <h1 className="hero-title">{config.TAGLINE}</h1>
                              <p className="hero-subtitle">
                                    Create ATS-optimized resumes with AI-powered scoring and suggestions
                              </p>
                              <div className="hero-stats">
                                    <div className="stat">
                                          <h3>AI-Powered</h3>
                                          <p>Smart scoring algorithm</p>
                                    </div>
                                    <div className="stat">
                                          <h3>100% Score</h3>
                                          <p>Comprehensive evaluation</p>
                                    </div>
                                    <div className="stat">
                                          <h3>65% Unlock</h3>
                                          <p>Advanced features</p>
                                    </div>
                              </div>
                              {!user && (
                                    <Link to="/signup" className="btn btn-primary btn-lg">Start Building Your Resume</Link>
                              )}
                        </div>
                  </section>

                  <section className="features">
                        <h2>Why Choose {config.APP_NAME}?</h2>
                        <div className="features-grid">
                              <div className="feature-card">
                                    <div className="feature-icon">📝</div>
                                    <h3>Multi-Step Builder</h3>
                                    <p>Easy 7-step process to create your perfect resume</p>
                              </div>
                              <div className="feature-card">
                                    <div className="feature-icon">🎯</div>
                                    <h3>Smart Scoring</h3>
                                    <p>Get scored on 6 categories totaling 100 points</p>
                              </div>
                              <div className="feature-card">
                                    <div className="feature-icon">💡</div>
                                    <h3>AI Suggestions</h3>
                                    <p>Receive intelligent improvements for your content</p>
                              </div>
                              <div className="feature-card">
                                    <div className="feature-icon">🔓</div>
                                    <h3>Unlock Features</h3>
                                    <p>Score 65%+ to unlock premium templates</p>
                              </div>
                              <div className="feature-card">
                                    <div className="feature-icon">📄</div>
                                    <h3>PDF Download</h3>
                                    <p>Export professional ATS-friendly PDFs</p>
                              </div>
                              <div className="feature-card">
                                    <div className="feature-icon">📱</div>
                                    <h3>Fully Responsive</h3>
                                    <p>Works on mobile, tablet, and desktop</p>
                              </div>
                        </div>
                  </section>

                  <footer className="footer">
                        <p>Created by {config.FOUNDER}</p>
                        <p>© 2026 {config.APP_NAME}. All rights reserved.</p>
                  </footer>
            </div>
      );
}

export default Landing;

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import '../styles/Landing.css';

function Landing() {
      const { user } = useAuth();

      return (
            <div className="landing">
                  {/* Floating ambient glowing background orbs */}
                  <div className="landing-orb landing-orb-1"></div>
                  <div className="landing-orb landing-orb-2"></div>
                  <div className="landing-orb landing-orb-3"></div>

                  {/* Modern Glass Navigation */}
                  <nav className="nav">
                        <div className="nav-brand">
                              <span className="brand-sparkle">✨</span>
                              <h2>{config.APP_NAME}</h2>
                        </div>
                        <div className="nav-links">
                              <a href="#features" className="nav-link-item">Features</a>
                              <a href="#scoring" className="nav-link-item">ATS Scoring</a>
                              <a href="#workflow" className="nav-link-item">How It Works</a>
                              {user ? (
                                    <Link to="/dashboard" className="btn btn-primary">
                                          Dashboard 🚀
                                    </Link>
                              ) : (
                                    <>
                                          <Link to="/login" className="btn btn-secondary">Sign In</Link>
                                          <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
                                    </>
                              )}
                        </div>
                  </nav>

                  {/* Hero Section */}
                  <section className="hero">
                        <div className="hero-container">
                              <div className="hero-left">
                                    <div className="hero-badge">
                                          <span>🔥</span> AI-Powered ATS Resume Builder &amp; Optimizer
                                    </div>
                                    <h1 className="hero-title">
                                          Build Resumes That <span className="gradient-text">Beat the ATS</span> &amp; Land Interviews
                                    </h1>
                                    <p className="hero-subtitle">
                                          Transform your career with smart 100-point ATS scoring, instant AI bullet generation, job description keyword matching, and 4 high-converting export templates.
                                    </p>

                                    <div className="hero-cta-group">
                                          {user ? (
                                                <Link to="/dashboard" className="btn btn-primary btn-lg pulse-btn">
                                                      Go to My Dashboard →
                                                </Link>
                                          ) : (
                                                <Link to="/signup" className="btn btn-primary btn-lg pulse-btn">
                                                      Start Building Free →
                                                </Link>
                                          )}
                                          <Link to={user ? "/resume/create" : "/signup"} className="btn btn-secondary btn-lg">
                                                ⚡ 1-Click AI Builder
                                          </Link>
                                    </div>

                                    <div className="hero-social-proof">
                                          <div className="proof-avatars">
                                                <span>👨‍💻</span>
                                                <span>👩‍💼</span>
                                                <span>👨‍🎨</span>
                                                <span>👩‍🔬</span>
                                          </div>
                                          <div className="proof-text">
                                                <strong>10,000+ Resumes Generated</strong> • 94% Interview Callback Rate
                                          </div>
                                    </div>
                              </div>

                              {/* Interactive Live Resume Glass Card */}
                              <div className="hero-right">
                                    <div className="mockup-glass-card">
                                          <div className="mockup-top-bar">
                                                <div className="mockup-dots">
                                                      <span className="dot-red"></span>
                                                      <span className="dot-yellow"></span>
                                                      <span className="dot-green"></span>
                                                </div>
                                                <span className="mockup-badge">✨ Live ATS Preview</span>
                                          </div>

                                          <div className="mockup-header">
                                                <div className="mockup-avatar">LK</div>
                                                <div>
                                                      <h4>Lokendra Kumar</h4>
                                                      <p className="mockup-role">Senior Full-Stack Engineer</p>
                                                </div>
                                                <div className="mockup-score-pill">
                                                      <span className="score-num">94%</span>
                                                      <span className="score-lbl">ATS Match</span>
                                                </div>
                                          </div>

                                          <div className="mockup-score-bar">
                                                <div className="bar-fill" style={{ width: '94%' }}></div>
                                          </div>

                                          <div className="mockup-section">
                                                <h5>EXPERIENCE HIGHLIGHT</h5>
                                                <p className="mockup-bullet">
                                                      🚀 <em>Engineered high-throughput FastAPI microservices, boosting throughput by 42% and slashing p99 latency to 18ms.</em>
                                                </p>
                                          </div>

                                          <div className="mockup-tags">
                                                <span className="mtag">React.js</span>
                                                <span className="mtag">Python</span>
                                                <span className="mtag">FastAPI</span>
                                                <span className="mtag">MongoDB</span>
                                                <span className="mtag">Docker</span>
                                          </div>

                                          <div className="mockup-footer-badge">
                                                <span>✅ Passed ATS Parsers</span>
                                                <span>🔓 Executive Tier Unlocked</span>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </section>

                  {/* Highlights Bar */}
                  <div className="highlights-bar">
                        <div className="highlight-item">
                              <span className="hicon">🎯</span>
                              <div>
                                    <h4>100-Point ATS Algorithm</h4>
                                    <p>Comprehensive scoring across 6 essential categories</p>
                              </div>
                        </div>
                        <div className="highlight-item">
                              <span className="hicon">⚡</span>
                              <div>
                                    <h4>AI Bullet Enhancer</h4>
                                    <p>Turn weak bullets into high-impact accomplishment statements</p>
                              </div>
                        </div>
                        <div className="highlight-item">
                              <span className="hicon">📄</span>
                              <div>
                                    <h4>4 Pro PDF Layouts</h4>
                                    <p>Modern, Executive, Tech, and Compact templates</p>
                              </div>
                        </div>
                  </div>

                  {/* How It Works Section */}
                  <section id="workflow" className="section-workflow">
                        <div className="section-header">
                              <span className="section-tag">STEP-BY-STEP PROCESS</span>
                              <h2>How {config.APP_NAME} Works</h2>
                              <p>From blank page to job interview in under 10 minutes</p>
                        </div>

                        <div className="workflow-grid">
                              <div className="workflow-card">
                                    <div className="step-badge">01</div>
                                    <div className="card-icon">📝</div>
                                    <h3>Fill or Auto-Generate</h3>
                                    <p>Follow our guided 10-step wizard or use 1-click sample autofill to set up your entire profile instantly.</p>
                              </div>

                              <div className="workflow-card">
                                    <div className="step-badge">02</div>
                                    <div className="card-icon">🧠</div>
                                    <h3>Enhance with AI</h3>
                                    <p>Generate 3 variations of strong, quantifiable action verbs for each project and experience item.</p>
                              </div>

                              <div className="workflow-card">
                                    <div className="step-badge">03</div>
                                    <div className="card-icon">🎯</div>
                                    <h3>Match Job Description</h3>
                                    <p>Paste any job description to instantly see your keyword match percentage and missing skills.</p>
                              </div>

                              <div className="workflow-card">
                                    <div className="step-badge">04</div>
                                    <div className="card-icon">📄</div>
                                    <h3>Instant PDF Export</h3>
                                    <p>Download clean, vector ATS-friendly PDFs formatted precisely for recruiters and automated parsers.</p>
                              </div>
                        </div>
                  </section>

                  {/* ATS Scoring System Showcase */}
                  <section id="scoring" className="section-scoring">
                        <div className="section-header">
                              <span className="section-tag">COMPREHENSIVE EVALUATION</span>
                              <h2>Smart 100-Point Scoring Engine</h2>
                              <p>Score 65%+ to unlock premium templates and unlimited resume duplications</p>
                        </div>

                        <div className="scoring-grid">
                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">💼</span>
                                          <span className="scat-points">20 Pts</span>
                                    </div>
                                    <h4>Work Experience</h4>
                                    <p>Action verbs, quantifiable achievements, and structured date durations.</p>
                              </div>

                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">🛠️</span>
                                          <span className="scat-points">20 Pts</span>
                                    </div>
                                    <h4>Skills &amp; Technologies</h4>
                                    <p>Technical depth, breadth across domains, and high-frequency industry keywords.</p>
                              </div>

                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">🚀</span>
                                          <span className="scat-points">20 Pts</span>
                                    </div>
                                    <h4>Project Impact</h4>
                                    <p>Live demos, repository links, technologies used, and measurable results.</p>
                              </div>

                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">📝</span>
                                          <span className="scat-points">15 Pts</span>
                                    </div>
                                    <h4>Professional Summary</h4>
                                    <p>Concise 50-150 word elevator pitch packed with relevant role achievements.</p>
                              </div>

                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">🎯</span>
                                          <span className="scat-points">15 Pts</span>
                                    </div>
                                    <h4>Keyword Relevance</h4>
                                    <p>Automated density matching against popular engineering &amp; product roles.</p>
                              </div>

                              <div className="score-category-card">
                                    <div className="scat-top">
                                          <span className="scat-icon">📐</span>
                                          <span className="scat-points">10 Pts</span>
                                    </div>
                                    <h4>Structure &amp; Formatting</h4>
                                    <p>Complete contact channels, coding profiles (LeetCode/GitHub), and education.</p>
                              </div>
                        </div>
                  </section>

                  {/* Call to Action Banner */}
                  <section className="section-cta">
                        <div className="cta-box">
                              <h2>Ready to Stand Out From Hundreds of Applicants?</h2>
                              <p>Join thousands of engineers and professionals using {config.APP_NAME} to get hired.</p>
                              <div className="cta-btns">
                                    <Link to={user ? "/dashboard" : "/signup"} className="btn btn-primary btn-lg">
                                          {user ? "Open My Dashboard →" : "Create My Resume Now — Free →"}
                                    </Link>
                              </div>
                        </div>
                  </section>

                  {/* Modern Footer */}
                  <footer className="footer">
                        <div className="footer-content">
                              <div className="footer-brand">
                                    <h3>✨ {config.APP_NAME}</h3>
                                    <p>{config.TAGLINE}</p>
                              </div>
                              <div className="footer-links">
                                    <span>Built with React, FastAPI &amp; MongoDB</span>
                                    <span>•</span>
                                    <span>Designed for Mobile &amp; Desktop</span>
                              </div>
                        </div>
                        <div className="footer-bottom">
                              <p>© 2026 {config.APP_NAME}. Crafted with ❤️ by {config.FOUNDER}. All rights reserved.</p>
                        </div>
                  </footer>
            </div>
      );
}

export default Landing;

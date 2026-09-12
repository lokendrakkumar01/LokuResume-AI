import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import ResumePreview from '../components/ResumePreview';
import axios from 'axios';
import config from '../config';
import '../styles/Dashboard.css';

function Dashboard() {
      const [resumes, setResumes] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchQuery, setSearchQuery] = useState('');
      const [filterScore, setFilterScore] = useState('all');
      const [selectedResumeForATS, setSelectedResumeForATS] = useState(null);
      const [previewResume, setPreviewResume] = useState(null);
      const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

      const { user, logout, getAuthHeader } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      useEffect(() => {
            fetchResumes();
      }, []);

      const fetchResumes = async () => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes`, {
                        headers: getAuthHeader()
                  });
                  setResumes(response.data);
                  setLoading(false);
            } catch (error) {
                  console.error('Failed to fetch resumes:', error);
                  showToast('Failed to load resumes', 'error');
                  setLoading(false);
            }
      };

      const confirmDelete = async () => {
            if (!deleteTarget) return;

            try {
                  await axios.delete(`${config.API_BASE_URL}/resumes/${deleteTarget.id}`, {
                        headers: getAuthHeader()
                  });
                  showToast(`Resume "${deleteTarget.name}" deleted`, 'info');
                  setDeleteTarget(null);
                  fetchResumes();
            } catch (error) {
                  showToast('Failed to delete resume', 'error');
            }
      };

      const handleDuplicate = async (id) => {
            try {
                  await axios.post(`${config.API_BASE_URL}/resumes/${id}/duplicate`, {}, {
                        headers: getAuthHeader()
                  });
                  showToast('Resume duplicated successfully!', 'success');
                  fetchResumes();
            } catch (error) {
                  showToast(error.response?.data?.detail || 'Failed to duplicate resume', 'error');
            }
      };

      const createSampleResume = async () => {
            try {
                  showToast('Creating AI sample resume...', 'info');
                  const sampleData = {
                        personal_info: {
                              name: user?.name || 'Alex Morgan',
                              email: user?.email || 'alex.morgan@example.com',
                              phone: '+1 (555) 382-9102',
                              linkedin: 'https://linkedin.com/in/alexmorgan',
                              github: 'https://github.com/alexmorgan',
                              leetcode: 'https://leetcode.com/alexmorgan',
                              portfolio: 'https://alexmorgan.dev',
                              headline: 'Senior Full-Stack Software Engineer',
                              problem_solving: 'https://hackerrank.com/alexmorgan'
                        },
                        summary: 'Accomplished Full-Stack Engineer with 5+ years of experience architecting distributed microservices and modern responsive web applications. Successfully spearheaded cloud modernization projects cutting infrastructure costs by 28% and improving API throughput by 42%.',
                        skills: ['React.js', 'Python', 'FastAPI', 'Node.js', 'TypeScript', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD', 'Git', 'Redis', 'GraphQL'],
                        projects: [
                              {
                                    title: 'AI Resume & Career Engine',
                                    technologies: 'React, FastAPI, MongoDB, OpenAI API',
                                    description: 'Architected and launched an AI-powered career platform serving 15,000+ engineers with automated ATS scoring and instant bullet optimization.',
                                    repository_url: 'https://github.com/alexmorgan/resume-ai',
                                    live_demo_url: 'https://resume-ai-demo.com'
                              },
                              {
                                    title: 'Real-Time Financial Analytics Platform',
                                    technologies: 'TypeScript, Next.js, Redis, WebSockets',
                                    description: 'Built high-throughput telemetry stream processing 25,000 events/sec with sub-20ms dashboard chart rendering.'
                              }
                        ],
                        experience: [
                              {
                                    company: 'Starlight Tech Solutions',
                                    role: 'Lead Full-Stack Engineer',
                                    duration: '2022 - Present',
                                    description: 'Led cross-functional team of 8 engineers building enterprise SaaS. Optimized API latency by 45% using Redis caching and connection pooling.'
                              },
                              {
                                    company: 'Apex Digital Systems',
                                    role: 'Software Engineer',
                                    duration: '2020 - 2022',
                                    description: 'Maintained 14 production REST microservices in Python & FastAPI with 99.98% availability SLA.'
                              }
                        ],
                        education: [
                              {
                                    degree: 'B.S. in Computer Science',
                                    college: 'University of Technology',
                                    year: '2016 - 2020',
                                    grade: '3.9 GPA'
                              }
                        ],
                        certifications: [
                              {
                                    name: 'AWS Certified Solutions Architect',
                                    issued_by: 'Amazon Web Services',
                                    date: '2023'
                              }
                        ],
                        achievements: [
                              {
                                    title: 'Global Hackathon Winner',
                                    description: 'Ranked 1st place out of 120 global engineering teams for AI developer tooling.',
                                    date: '2023'
                              }
                        ],
                        coding_profiles: [
                              {
                                    platform: 'LeetCode',
                                    link: 'https://leetcode.com/alexmorgan',
                                    headline: 'Solved 450+ Problems (Top 5%)'
                              },
                              {
                                    platform: 'GitHub',
                                    link: 'https://github.com/alexmorgan',
                                    headline: '500+ Contributions in 2025'
                              }
                        ],
                        template_style: 'modern',
                        pdf_preferences: {
                              background_color: '#ffffff',
                              accent_color: '#4f46e5'
                        }
                  };

                  await axios.post(`${config.API_BASE_URL}/resumes`, sampleData, {
                        headers: getAuthHeader()
                  });

                  showToast('AI Sample Resume created with 90%+ ATS score!', 'success');
                  fetchResumes();
            } catch (err) {
                  showToast('Failed to create sample resume', 'error');
            }
      };

      const handleDownload = async (id, name) => {
            try {
                  showToast('Generating PDF...', 'info');
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}/download`, {
                        headers: getAuthHeader(),
                        responseType: 'blob'
                  });

                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `${name.replace(/\s+/g, '_')}_Resume.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  showToast('PDF downloaded!', 'success');
            } catch (error) {
                  console.error('PDF Download Error:', error);
                  showToast('Failed to generate PDF', 'error');
            }
      };

      const getScoreColor = (score) => {
            if (score < 50) return 'score-red';
            if (score < 65) return 'score-orange';
            return 'score-green';
      };

      // Filtered resumes
      const filteredResumes = resumes.filter((r) => {
            const matchesSearch = (r.personal_info?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (r.personal_info?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (filterScore === 'unlocked') return matchesSearch && r.score >= 65;
            if (filterScore === 'improving') return matchesSearch && r.score < 65;
            return matchesSearch;
      });

      // Calculate Metrics
      const totalResumes = resumes.length;
      const avgScore = totalResumes > 0 ? (resumes.reduce((acc, r) => acc + r.score, 0) / totalResumes).toFixed(1) : 0;
      const highScore = totalResumes > 0 ? Math.max(...resumes.map(r => r.score)) : 0;
      const unlockedCount = resumes.filter(r => r.score >= 65).length;

      return (
            <div className="dashboard">
                  <nav className="dashboard-nav">
                        <div className="nav-brand">
                              <span>✨</span>
                              <h2>{config.APP_NAME}</h2>
                        </div>
                        <div className="nav-right">
                              <div className="user-welcome-badge">
                                    <span>👤</span>
                                    <span>{user?.name}</span>
                              </div>
                              <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
                        </div>
                  </nav>

                  <div className="dashboard-container">
                        {/* Metrics Bar */}
                        <div className="metrics-grid">
                              <div className="metric-card">
                                    <div className="metric-icon-bg icon-purple">📄</div>
                                    <div className="metric-info">
                                          <h4>Total Resumes</h4>
                                          <div className="metric-value">{totalResumes}</div>
                                    </div>
                              </div>
                              <div className="metric-card">
                                    <div className="metric-icon-bg icon-blue">📊</div>
                                    <div className="metric-info">
                                          <h4>Average ATS Score</h4>
                                          <div className="metric-value">{avgScore}%</div>
                                    </div>
                              </div>
                              <div className="metric-card">
                                    <div className="metric-icon-bg icon-green">🏆</div>
                                    <div className="metric-info">
                                          <h4>High Score</h4>
                                          <div className="metric-value">{highScore}%</div>
                                    </div>
                              </div>
                              <div className="metric-card">
                                    <div className="metric-icon-bg icon-orange">🔓</div>
                                    <div className="metric-info">
                                          <h4>Unlocked Tier (65%+)</h4>
                                          <div className="metric-value">{unlockedCount} / {totalResumes}</div>
                                    </div>
                              </div>
                        </div>

                        {/* Controls Header */}
                        <div className="dashboard-header">
                              <h1>My Resumes</h1>
                              <div className="controls-bar">
                                    <div className="search-wrapper">
                                          <span className="search-icon">🔍</span>
                                          <input
                                                type="text"
                                                placeholder="Search resumes by name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                          />
                                    </div>

                                    <select
                                          value={filterScore}
                                          onChange={(e) => setFilterScore(e.target.value)}
                                          style={{ width: 'auto' }}
                                    >
                                          <option value="all">All Scores</option>
                                          <option value="unlocked">Unlocked (65%+)</option>
                                          <option value="improving">Needs Work (&lt;65%)</option>
                                    </select>

                                    <button onClick={createSampleResume} className="btn btn-secondary" title="Auto-populate with high ATS score demo data">
                                          ✨ Try AI Sample
                                    </button>

                                    <Link to="/resume/create" className="btn btn-primary">
                                          + Create New Resume
                                    </Link>
                              </div>
                        </div>

                        {/* Resume List Grid */}
                        {loading ? (
                              <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
                                    <p style={{ color: 'var(--text-muted)' }}>Loading resumes...</p>
                              </div>
                        ) : filteredResumes.length === 0 ? (
                              <div className="empty-state">
                                    <div className="empty-icon">📄</div>
                                    <h3>{resumes.length === 0 ? 'No resumes yet' : 'No matching resumes'}</h3>
                                    <p>
                                          {resumes.length === 0
                                                ? 'Create your first AI-powered ATS resume or generate a complete sample profile with 1 click!'
                                                : 'Try adjusting your search query or score filter.'}
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                                          <button onClick={createSampleResume} className="btn btn-secondary">
                                                ✨ Generate AI Sample Resume
                                          </button>
                                          <Link to="/resume/create" className="btn btn-primary">
                                                + Build from Scratch
                                          </Link>
                                    </div>
                              </div>
                        ) : (
                              <div className="resumes-grid">
                                    {filteredResumes.map((resume) => (
                                          <div key={resume.id} className="resume-card fade-in">
                                                <div className="resume-card-header">
                                                      <div>
                                                            <h3>{resume.personal_info?.name || 'Untitled Resume'}</h3>
                                                            <p className="resume-email">{resume.personal_info?.headline || resume.personal_info?.email}</p>
                                                      </div>
                                                      <span className={`score-badge ${getScoreColor(resume.score)}`}>
                                                            🎯 {resume.score}%
                                                      </span>
                                                </div>

                                                {/* Visual ATS Progress Bar */}
                                                <div className="card-score-progress">
                                                      <div
                                                            className="card-score-fill"
                                                            style={{
                                                                  width: `${Math.min(100, Math.max(5, resume.score))}%`,
                                                                  background: resume.score >= 65 ? 'linear-gradient(90deg, #6366f1, #22c55e)' : 'linear-gradient(90deg, #ef4444, #f59e0b)'
                                                            }}
                                                      />
                                                </div>

                                                <div className="resume-stats">
                                                      <div className="stat-item">
                                                            <span className="stat-label">Skills:</span>
                                                            <span className="stat-value">{resume.skills?.length || 0}</span>
                                                      </div>
                                                      <div className="stat-item">
                                                            <span className="stat-label">Projects:</span>
                                                            <span className="stat-value">{resume.projects?.length || 0}</span>
                                                      </div>
                                                      <div className="stat-item">
                                                            <span className="stat-label">Exp:</span>
                                                            <span className="stat-value">{resume.experience?.length || 0}</span>
                                                      </div>
                                                </div>

                                                {resume.score < 65 && (
                                                      <div className="resume-locked">
                                                            🔒 Score 65%+ to unlock duplicate &amp; template customization
                                                      </div>
                                                )}

                                                <div className="resume-actions">
                                                      <button
                                                            onClick={() => setPreviewResume(resume)}
                                                            className="btn btn-sm btn-secondary"
                                                            title="Quick Live Preview"
                                                      >
                                                            👁️ View
                                                      </button>

                                                      <button
                                                            onClick={() => navigate(`/resume/edit/${resume.id}`)}
                                                            className="btn btn-sm btn-secondary"
                                                            title="Edit Resume"
                                                      >
                                                            ✏️ Edit
                                                      </button>

                                                      <button
                                                            onClick={() => handleDownload(resume.id, resume.personal_info?.name || 'My')}
                                                            className="btn btn-sm btn-primary"
                                                            title="Download PDF"
                                                      >
                                                            📄 PDF
                                                      </button>

                                                      <button
                                                            onClick={() => setSelectedResumeForATS(resume)}
                                                            className="btn btn-sm btn-secondary"
                                                            title="Analyze against Job Description"
                                                      >
                                                            🎯 ATS Match
                                                      </button>

                                                      {resume.score >= 65 && (
                                                            <button
                                                                  onClick={() => handleDuplicate(resume.id)}
                                                                  className="btn btn-sm btn-success"
                                                                  title="Duplicate Resume"
                                                            >
                                                                  📋 Copy
                                                            </button>
                                                      )}

                                                      <button
                                                            onClick={() => setDeleteTarget({ id: resume.id, name: resume.personal_info?.name || 'Untitled' })}
                                                            className="btn btn-sm btn-danger"
                                                            title="Delete Resume"
                                                      >
                                                            🗑️
                                                      </button>
                                                </div>
                                          </div>
                                    ))}
                              </div>
                        )}
                  </div>

                  {/* Quick Live Preview Modal */}
                  {previewResume && (
                        <ResumePreview
                              formData={previewResume}
                              onClose={() => setPreviewResume(null)}
                        />
                  )}

                  {/* ATS Analyzer Modal */}
                  {selectedResumeForATS && (
                        <ATSAnalyzerModal
                              resume={selectedResumeForATS}
                              onClose={() => setSelectedResumeForATS(null)}
                        />
                  )}

                  {/* Custom Glassmorphic Delete Modal */}
                  {deleteTarget && (
                        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                              <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 28 }}>
                                    <h3 style={{ color: '#ef4444', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                          ⚠️ Delete Resume
                                    </h3>
                                    <p style={{ color: 'var(--text-main)', marginBottom: 20 }}>
                                          Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This action is permanent and cannot be undone.
                                    </p>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                          <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
                                                Cancel
                                          </button>
                                          <button onClick={confirmDelete} className="btn btn-danger">
                                                Confirm Delete
                                          </button>
                                    </div>
                              </div>
                        </div>
                  )}

                  <footer className="dashboard-footer">
                        <p>© 2026 {config.APP_NAME} • Created by {config.FOUNDER} • {config.TAGLINE}</p>
                  </footer>
            </div>
      );
}

export default Dashboard;

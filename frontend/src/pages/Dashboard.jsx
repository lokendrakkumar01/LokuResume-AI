import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import axios from 'axios';
import config from '../config';
import '../styles/Dashboard.css';

function Dashboard() {
      const [resumes, setResumes] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchQuery, setSearchQuery] = useState('');
      const [filterScore, setFilterScore] = useState('all');
      const [selectedResumeForATS, setSelectedResumeForATS] = useState(null);

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

      const handleDelete = async (id) => {
            if (!window.confirm('Are you sure you want to delete this resume?')) return;

            try {
                  await axios.delete(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });
                  showToast('Resume deleted successfully', 'info');
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
                  showToast('Resume duplicated!', 'success');
                  fetchResumes();
            } catch (error) {
                  showToast(error.response?.data?.detail || 'Failed to duplicate resume', 'error');
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

                                    <Link to="/resume/create" className="btn btn-primary">
                                          + Create New Resume
                                    </Link>
                              </div>
                        </div>

                        {/* Resume List Grid */}
                        {loading ? (
                              <div className="glass-panel" style={{ padding: '40px', textCenter: 'center' }}>
                                    <p>Loading resumes...</p>
                              </div>
                        ) : filteredResumes.length === 0 ? (
                              <div className="empty-state">
                                    <div className="empty-icon">📄</div>
                                    <h3>{resumes.length === 0 ? 'No resumes yet' : 'No matching resumes'}</h3>
                                    <p>
                                          {resumes.length === 0
                                                ? 'Create your first AI-powered ATS resume in minutes and unlock job callbacks!'
                                                : 'Try adjusting your search query or score filter.'}
                                    </p>
                                    {resumes.length === 0 && (
                                          <Link to="/resume/create" className="btn btn-primary">
                                                + Create Your First Resume
                                          </Link>
                                    )}
                              </div>
                        ) : (
                              <div className="resumes-grid">
                                    {filteredResumes.map((resume) => (
                                          <div key={resume.id} className="resume-card fade-in">
                                                <div className="resume-card-header">
                                                      <div>
                                                            <h3>{resume.personal_info.name}</h3>
                                                            <p className="resume-email">{resume.personal_info.headline || resume.personal_info.email}</p>
                                                      </div>
                                                      <span className={`score-badge ${getScoreColor(resume.score)}`}>
                                                            🎯 {resume.score}%
                                                      </span>
                                                </div>

                                                <div className="resume-stats">
                                                      <div className="stat-item">
                                                            <span className="stat-label">Skills:</span>
                                                            <span className="stat-value">{resume.skills.length}</span>
                                                      </div>
                                                      <div className="stat-item">
                                                            <span className="stat-label">Projects:</span>
                                                            <span className="stat-value">{resume.projects.length}</span>
                                                      </div>
                                                      <div className="stat-item">
                                                            <span className="stat-label">Exp:</span>
                                                            <span className="stat-value">{resume.experience.length}</span>
                                                      </div>
                                                </div>

                                                {resume.score < 65 && (
                                                      <div className="resume-locked">
                                                            🔒 Score 65%+ to unlock duplicate &amp; template customization
                                                      </div>
                                                )}

                                                <div className="resume-actions">
                                                      <button
                                                            onClick={() => navigate(`/resume/edit/${resume.id}`)}
                                                            className="btn btn-sm btn-secondary"
                                                      >
                                                            ✏️ Edit
                                                      </button>

                                                      <button
                                                            onClick={() => handleDownload(resume.id, resume.personal_info.name)}
                                                            className="btn btn-sm btn-primary"
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
                                                            >
                                                                  📋 Duplicate
                                                            </button>
                                                      )}

                                                      <button
                                                            onClick={() => handleDelete(resume.id)}
                                                            className="btn btn-sm btn-danger"
                                                      >
                                                            🗑️ Delete
                                                      </button>
                                                </div>
                                          </div>
                                    ))}
                              </div>
                        )}
                  </div>

                  {/* ATS Analyzer Modal */}
                  {selectedResumeForATS && (
                        <ATSAnalyzerModal
                              resume={selectedResumeForATS}
                              onClose={() => setSelectedResumeForATS(null)}
                        />
                  )}

                  <footer className="dashboard-footer">
                        <p>© 2026 {config.APP_NAME} • Created by {config.FOUNDER} • {config.TAGLINE}</p>
                  </footer>
            </div>
      );
}

export default Dashboard;

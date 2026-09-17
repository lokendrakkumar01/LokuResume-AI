import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import ResumePreview from '../components/ResumePreview';
import ErrorBoundary from '../components/ErrorBoundary';
import axios from 'axios';
import config from '../config';
import '../styles/Dashboard.css';

function Dashboard() {
      const { user, logout, getAuthHeader, isAdmin, studentTrack, setStudentTrack } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      const userKey = (user?.id || user?._id || user?.email || '').toString().trim();
      const specificCacheKey = userKey ? `cached_resumes_${userKey}` : 'cached_resumes';

      const getCachedResumes = () => {
            try {
                  const specific = userKey ? localStorage.getItem(`cached_resumes_${userKey}`) : null;
                  if (specific) return JSON.parse(specific);
                  const legacy = localStorage.getItem('cached_resumes');
                  return legacy ? JSON.parse(legacy) : [];
            } catch (e) {
                  return [];
            }
      };

      const [resumes, setResumes] = useState(getCachedResumes);
      const [loading, setLoading] = useState(() => getCachedResumes().length === 0);
      const [isSyncing, setIsSyncing] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
      const [filterScore, setFilterScore] = useState('all');
      const [selectedResumeForATS, setSelectedResumeForATS] = useState(null);
      const [previewResume, setPreviewResume] = useState(null);
      const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
      const [broadcast, setBroadcast] = useState(null);
      const [features, setFeatures] = useState({});

      const saveResumesCache = (data) => {
            try {
                  if (userKey) {
                        localStorage.setItem(`cached_resumes_${userKey}`, JSON.stringify(data));
                  }
                  localStorage.setItem('cached_resumes', JSON.stringify(data));
            } catch (e) {
                  // ignore localStorage quota errors
            }
      };

      const fetchBroadcast = async () => {
            try {
                  const res = await axios.get(`${config.API_BASE_URL}/admin/public-broadcast`, { timeout: 8000 });
                  if (res.data?.broadcast?.active) {
                        setBroadcast(res.data.broadcast);
                  }
            } catch {
                  // ignore
            }
      };

      const fetchFeatures = async () => {
            try {
                  const res = await axios.get(`${config.API_BASE_URL}/admin/public-features`, { timeout: 8000 });
                  if (res.data?.features) {
                        setFeatures(res.data.features);
                  }
            } catch {
                  // ignore
            }
      };

      const fetchResumes = async () => {
            setIsSyncing(true);
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes`, {
                        headers: getAuthHeader(),
                        timeout: 15000 // 15s timeout
                  });
                  setResumes(response.data);
                  saveResumesCache(response.data);
            } catch (error) {
                  console.error('Failed to fetch resumes:', error);
                  if (resumes.length === 0) {
                        showToast('Failed to load resumes from server', 'error');
                  }
            } finally {
                  setLoading(false);
                  setIsSyncing(false);
            }
      };

      useEffect(() => {
            // Load from user cache immediately on user change
            const cached = getCachedResumes();
            if (cached.length > 0) {
                  setResumes(cached);
                  setLoading(false);
            }
            // Fetch fresh data in parallel
            Promise.allSettled([
                  fetchResumes(),
                  fetchBroadcast(),
                  fetchFeatures()
            ]);
      }, [userKey]);

      useEffect(() => {
            const handleKeyDown = (e) => {
                  if (e.key === 'Escape') {
                        if (deleteTarget) setDeleteTarget(null);
                        if (previewResume) setPreviewResume(null);
                        if (selectedResumeForATS) setSelectedResumeForATS(null);
                  }
            };
            if (deleteTarget || previewResume || selectedResumeForATS) {
                  document.body.style.overflow = 'hidden';
                  window.addEventListener('keydown', handleKeyDown);
            } else {
                  document.body.style.overflow = '';
            }
            return () => {
                  document.body.style.overflow = '';
                  window.removeEventListener('keydown', handleKeyDown);
            };
      }, [deleteTarget, previewResume, selectedResumeForATS]);

      const confirmDelete = async () => {
            if (!deleteTarget) return;

            const targetId = deleteTarget.id;
            const targetName = deleteTarget.name;
            const previousResumes = [...resumes];

            // Optimistic Instant Removal from UI
            const updated = resumes.filter((r) => r.id !== targetId);
            setResumes(updated);
            saveResumesCache(updated);
            setDeleteTarget(null);
            showToast(`Resume "${targetName}" deleted`, 'info');

            try {
                  await axios.delete(`${config.API_BASE_URL}/resumes/${targetId}`, {
                        headers: getAuthHeader()
                  });
            } catch (error) {
                  // Rollback on failure
                  setResumes(previousResumes);
                  saveResumesCache(previousResumes);
                  showToast('Failed to delete resume on server', 'error');
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
                  const isBiz = (user?.track || studentTrack) === 'business';
                  showToast(`Creating 90%+ ATS ${isBiz ? 'Business Executive' : 'Tech Developer'} sample...`, 'info');

                  const sampleData = isBiz ? {
                        track: 'business',
                        personal_info: {
                              name: user?.name || 'Michael Scott',
                              email: user?.email || 'michael.scott@dundermifflin.com',
                              phone: '+1 (555) 019-2834',
                              location: 'Scranton, PA',
                              linkedin: 'https://linkedin.com/in/michael-scott-executive',
                              portfolio: 'https://dundermifflin.com/leadership/scranton',
                              headline: 'Regional Manager & Executive Director | P&L, Operations & Sales Leadership'
                        },
                        summary: 'Dynamic, high-performing Business Executive with 12+ years of proven success directing branch operations, P&L management, and client relationship retention. Steered Scranton branch to highest profitability across all 7 regional offices, achieving 128% of annual revenue target.',
                        skills: ['Strategic Planning', 'P&L Management', 'Sales & Negotiations', 'Team Leadership', 'Budgeting & Forecasting', 'Client Relationship (CRM)', 'Operations Management', 'Cross-Functional Collaboration'],
                        references: [
                              { name: 'David Wallace', company: 'Dunder Mifflin Inc.', role: 'Chief Financial Officer (CFO)', phone: '+1 (555) 019-9944', email: 'dwallace@dundermifflin.com' },
                              { name: 'Jan Levinson', company: 'Corporate Headquarters', role: 'VP of Regional Sales', phone: '+1 (555) 019-4422', email: 'jlevinson@corporate.com' }
                        ],
                        experience: [
                              {
                                    company: 'Dunder Mifflin Paper Company',
                                    role: 'Regional Manager',
                                    duration: '2013 - Present',
                                    description: 'Directed all branch sales operations, fiscal budgets, and 15-person cross-functional staff. Grew annual branch revenue by 24% and reduced client churn to sub-2%.'
                              },
                              {
                                    company: 'Dunder Mifflin Paper Company',
                                    role: 'Senior Sales Representative',
                                    duration: '2008 - 2013',
                                    description: 'Closed $1.8M in enterprise paper supply contracts. Awarded Consecutive Salesman of the Year for highest revenue generation.'
                              }
                        ],
                        education: [
                              {
                                    degree: 'Bachelor of Science in Business Administration',
                                    college: 'Pennsylvania State University',
                                    year: '2004 - 2008',
                                    grade: '3.8 GPA'
                              }
                        ],
                        languages: [
                              { language: 'English', proficiency: 'Native / Bilingual' },
                              { language: 'Spanish', proficiency: 'Professional Working' }
                        ],
                        hobbies: ['Strategic Chess', 'Public Speaking', 'Improv Comedy', 'Mentorship & Coaching'],
                        certifications: [
                              { name: 'Executive Leadership & P&L Management', issued_by: 'Wharton Executive Education', date: '2022' }
                        ],
                        achievements: [
                              { title: 'Regional Branch of the Year Award', description: 'Recognized for consecutive quarterly profitability and highest customer retention score nationwide.', date: '2024' }
                        ],
                        template_style: 'business_executive',
                        pdf_preferences: { background_color: '#ffffff', accent_color: '#111827', include_photo: true }
                  } : {
                        track: 'tech',
                        personal_info: {
                              name: user?.name || 'Alex Morgan',
                              email: user?.email || 'alex.morgan@example.com',
                              phone: '+1 (555) 382-9102',
                              location: 'San Francisco, CA',
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
                              accent_color: '#e11d48'
                        }
                  };

                  await axios.post(`${config.API_BASE_URL}/resumes`, sampleData, {
                        headers: getAuthHeader()
                  });

                  showToast(`${isBiz ? 'Michael Scott Business Executive' : 'Tech Developer'} 90%+ ATS Sample created!`, 'success');
                  fetchResumes();
            } catch (err) {
                  showToast('Failed to create sample resume', 'error');
            }
      };

      const handleDownload = async (id, name, score, options = {}) => {
            if (score !== undefined && score < 50) {
                  showToast(`Resume score is ${score}%. Complete at least 50% of your resume to unlock PDF download.`, 'warning');
                  return;
            }
            try {
                  showToast('Generating PDF...', 'info');
                  const queryParams = new URLSearchParams();
                  if (options.template_style) queryParams.append('template_style', options.template_style);
                  if (options.accent_color) queryParams.append('accent_color', options.accent_color);
                  if (options.include_photo !== undefined) queryParams.append('include_photo', options.include_photo);

                  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}/download${queryString}`, {
                        headers: getAuthHeader(),
                        responseType: 'blob'
                  });

                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  const safeName = (name || 'Resume').replace(/\s+/g, '_');
                  link.setAttribute('download', `${safeName}_Resume.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  showToast('PDF downloaded successfully!', 'success');
            } catch (error) {
                  console.error('PDF Download Error:', error);
                  if (error.response?.status === 403) {
                        showToast('Resume score must be at least 50% to download PDF. Please complete your resume.', 'warning');
                  } else {
                        showToast('Failed to generate PDF', 'error');
                  }
            }
      };

      const getScoreColor = (score) => {
            const s = score || 0;
            if (s < 50) return 'score-red';
            if (s < 70) return 'score-orange';
            return 'score-green';
      };

      // Filtered resumes
      const filteredResumes = resumes.filter((r) => {
            const matchesSearch = (r.personal_info?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (r.personal_info?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            const score = r.score || 0;
            if (filterScore === 'unlocked') return matchesSearch && score >= 50;
            if (filterScore === 'improving') return matchesSearch && score < 50;
            return matchesSearch;
      });

      // Calculate Metrics
      const totalResumes = resumes.length;
      const avgScore = totalResumes > 0 ? (resumes.reduce((acc, r) => acc + (r.score || 0), 0) / totalResumes).toFixed(1) : 0;
      const highScore = totalResumes > 0 ? Math.max(...resumes.map(r => r.score || 0)) : 0;
      const unlockedCount = resumes.filter(r => (r.score || 0) >= 50).length;

      return (
            <div className="dashboard">
                  <nav className="dashboard-nav">
                        <div className="nav-brand">
                              <span>✨</span>
                              <h2>{config.APP_NAME}</h2>
                        </div>
                        <div className="nav-right">
                              {isAdmin && (
                                    <Link
                                          to="/admin"
                                          className="btn btn-secondary btn-sm"
                                          style={{
                                                borderColor: 'rgba(225, 29, 72, 0.4)',
                                                color: '#fda4af',
                                                background: 'rgba(225, 29, 72, 0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontWeight: '700'
                                          }}
                                    >
                                          <span>🛡️</span>
                                          <span>Admin Portal</span>
                                    </Link>
                              )}
                              <button
                                    type="button"
                                    onClick={() => setStudentTrack && setStudentTrack(studentTrack === 'business' ? 'tech' : 'business')}
                                    style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '5px 12px',
                                          borderRadius: '9999px',
                                          background: studentTrack === 'business' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                          border: `1px solid ${studentTrack === 'business' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                                          color: studentTrack === 'business' ? '#fbbf24' : '#60a5fa',
                                          fontSize: '0.8rem',
                                          fontWeight: '700',
                                          cursor: 'pointer'
                                    }}
                                    title="Click to toggle your active stream track"
                              >
                                    <span>{studentTrack === 'business' ? '💼 Business Stream' : '💻 Tech Stream'}</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Switch)</span>
                              </button>
                              <div className="user-welcome-badge">
                                    <span>👤</span>
                                    <span>{user?.name}</span>
                              </div>
                              <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
                        </div>
                  </nav>

                  <div className="dashboard-container">
                        {/* Platform Broadcast Banner */}
                        {broadcast && broadcast.active && broadcast.message && (
                              <div
                                    className={`platform-broadcast-banner broadcast-${broadcast.type || 'info'}`}
                                    style={{
                                          marginBottom: '1.75rem',
                                          padding: '0.85rem 1.25rem',
                                          borderRadius: '12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.75rem',
                                          fontSize: '0.9rem',
                                          fontWeight: '600',
                                          background: broadcast.type === 'alert' ? 'rgba(225,29,72,0.15)' : broadcast.type === 'warning' ? 'rgba(245,158,11,0.15)' : broadcast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                          border: `1px solid ${broadcast.type === 'alert' ? 'rgba(225,29,72,0.4)' : broadcast.type === 'warning' ? 'rgba(245,158,11,0.4)' : broadcast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)'}`,
                                          color: broadcast.type === 'alert' ? '#fda4af' : broadcast.type === 'warning' ? '#fcd34d' : broadcast.type === 'success' ? '#6ee7b7' : '#93c5fd',
                                          boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                                    }}
                              >
                                    <span style={{ fontSize: '1.1rem' }}>
                                          {broadcast.type === 'alert' ? '🚨' : broadcast.type === 'warning' ? '⚠️' : broadcast.type === 'success' ? '🎉' : '📢'}
                                    </span>
                                    <span>{broadcast.message}</span>
                              </div>
                        )}

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

                        {/* AI Career Coach Guidance Banner */}
                        <div className="ai-coach-banner">
                              <div className="ai-coach-banner-left">
                                    <div className="ai-coach-avatar">🎙️</div>
                                    <div>
                                          <h3>AI Resume Career Coach &amp; Voice Guide</h3>
                                          <p>Step-by-step guidance on reaching 90%+ ATS score, Google XYZ formula, and in-demand skills.</p>
                                    </div>
                              </div>
                              <div className="ai-coach-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {features?.ai_voice_assistant?.status === 'public' && (
                                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
                                                ✨ Free for All (Unlocked by Admin)
                                          </span>
                                    )}
                                    {features?.ai_voice_assistant?.status === 'premium' && (
                                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.25rem 0.65rem', borderRadius: '20px' }}>
                                                💎 Pro VIP Feature
                                          </span>
                                    )}
                                    <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          onClick={() => window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: user?.name, action: 'manual' } }))}
                                    >
                                          🎙️ Start AI Voice Guide
                                    </button>
                              </div>
                        </div>

                        {/* Controls Header */}
                        <div className="dashboard-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <h1 style={{ margin: 0 }}>My Resumes</h1>
                                    {isSyncing && (
                                          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.18rem 0.55rem', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                                                Syncing...
                                          </span>
                                    )}
                              </div>
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
                                          <option value="unlocked">Unlocked (50%+)</option>
                                          <option value="improving">Needs Work (&lt;50%)</option>
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
                        {loading && resumes.length === 0 ? (
                              <div className="resumes-grid">
                                    {[1, 2, 3].map((sk) => (
                                          <div key={sk} className="resume-card skeleton-card">
                                                <div className="skeleton-line skeleton-title"></div>
                                                <div className="skeleton-line skeleton-meta"></div>
                                                <div className="skeleton-bar"></div>
                                                <div className="skeleton-actions">
                                                      <div className="skeleton-btn"></div>
                                                      <div className="skeleton-btn"></div>
                                                </div>
                                          </div>
                                    ))}
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
                                                                  background: resume.score >= 50 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #f59e0b)'
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

                                                {resume.score < 50 && (
                                                      <div className="resume-locked">
                                                            🔒 Score 50%+ to unlock PDF download ({resume.score}% / 50%)
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

                                                      {resume.score >= 50 ? (
                                                            <button
                                                                  onClick={() => handleDownload(resume.id, resume.personal_info?.name || 'My', resume.score)}
                                                                  className="btn btn-sm btn-primary"
                                                                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff', fontWeight: 600 }}
                                                                  title="Download Official PDF"
                                                            >
                                                                  📄 PDF
                                                            </button>
                                                      ) : (
                                                            <button
                                                                  onClick={() => handleDownload(resume.id, resume.personal_info?.name || 'My', resume.score)}
                                                                  className="btn btn-sm btn-secondary"
                                                                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                                                  title={`Resume score is ${resume.score}%. Reach 50% to unlock PDF download`}
                                                            >
                                                                  🔒 {resume.score}%
                                                            </button>
                                                      )}

                                                      <button
                                                            onClick={() => setSelectedResumeForATS(resume)}
                                                            className="btn btn-sm btn-secondary"
                                                            title="Analyze against Job Description"
                                                      >
                                                            🎯 ATS Match
                                                      </button>

                                                      {resume.score >= 50 && (
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
                        <ErrorBoundary onReset={() => setPreviewResume(null)}>
                              <ResumePreview
                                    formData={previewResume}
                                    score={previewResume.score}
                                    onDownloadPDF={(opts) => handleDownload(previewResume.id, previewResume.personal_info?.name || 'Resume', previewResume.score, opts)}
                                    onUpdatePreferences={async (prefs) => {
                                          try {
                                                await axios.put(`${config.API_BASE_URL}/resumes/${previewResume.id}/preferences`, prefs, { headers: getAuthHeader() });
                                                setPreviewResume(prev => ({
                                                      ...prev,
                                                      template_style: prefs.template_style || prev.template_style,
                                                      pdf_preferences: { ...(prev.pdf_preferences || {}), ...prefs }
                                                }));
                                          } catch (err) {
                                                console.warn('Sync preferences error in Dashboard:', err);
                                          }
                                    }}
                                    onClose={() => setPreviewResume(null)}
                              />
                        </ErrorBoundary>
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
                              <div className="glass-card modal-content delete-modal-card" onClick={(e) => e.stopPropagation()}>
                                    <div className="delete-modal-header">
                                          <div className="delete-modal-icon-badge">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <polyline points="3 6 5 6 21 6"></polyline>
                                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                                </svg>
                                          </div>
                                          <button className="delete-modal-close" onClick={() => setDeleteTarget(null)} title="Close">✕</button>
                                    </div>
                                    <h3 className="delete-modal-title">Delete Resume?</h3>
                                    <p className="delete-modal-text">
                                          Are you sure you want to permanently delete <strong>"{deleteTarget.name}"</strong>? All associated ATS scores, tailored versions, and PDF downloads will be removed.
                                    </p>
                                    <div className="delete-modal-actions">
                                          <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary delete-btn-cancel">
                                                Keep Resume
                                          </button>
                                          <button onClick={confirmDelete} className="btn btn-danger delete-btn-confirm">
                                                🗑️ Yes, Delete
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

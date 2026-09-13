import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import config from '../config';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'resumes' | 'broadcast' | 'settings'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [broadcast, setBroadcast] = useState({ message: '', type: 'info', active: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [resumeSearch, setResumeSearch] = useState('');

  // Feature Flags state
  const [features, setFeatures] = useState({});
  const [featuresSaving, setFeaturesSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { user, adminLogout, getAuthHeader } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Fetch all admin data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const headers = getAuthHeader();

      const [statsRes, usersRes, resumesRes, broadcastRes, featuresRes] = await Promise.all([
        axios.get(`${config.API_BASE_URL}/admin/stats`, { headers }).catch(e => ({ data: null })),
        axios.get(`${config.API_BASE_URL}/admin/users`, { headers }).catch(e => ({ data: { users: [] } })),
        axios.get(`${config.API_BASE_URL}/admin/resumes`, { headers }).catch(e => ({ data: { resumes: [] } })),
        axios.get(`${config.API_BASE_URL}/admin/broadcast`, { headers }).catch(e => ({ data: { broadcast: null } })),
        axios.get(`${config.API_BASE_URL}/admin/features`, { headers }).catch(e => ({ data: { features: {} } }))
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data?.users) setUsers(usersRes.data.users);
      if (resumesRes.data?.resumes) setResumes(resumesRes.data.resumes);
      if (broadcastRes.data?.broadcast) {
        setBroadcast(broadcastRes.data.broadcast);
      }
      if (featuresRes.data?.features) {
        setFeatures(featuresRes.data.features);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Failed to refresh some admin metrics', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeader, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle user deletion
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`⚠️ Permanently delete user "${userName}" and all their resumes? This action cannot be undone.`)) {
      return;
    }

    try {
      const headers = getAuthHeader();
      await axios.delete(`${config.API_BASE_URL}/admin/users/${userId}`, { headers });
      showToast(`User ${userName} deleted successfully.`, 'success');
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh stats
      fetchDashboardData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete user';
      showToast(msg, 'error');
    }
  };

  // Handle resume deletion
  const handleDeleteResume = async (resumeId, candidateName) => {
    if (!window.confirm(`⚠️ Permanently remove resume for "${candidateName}" from the platform?`)) {
      return;
    }

    try {
      const headers = getAuthHeader();
      await axios.delete(`${config.API_BASE_URL}/admin/resumes/${resumeId}`, { headers });
      showToast('Resume permanently deleted.', 'success');
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      fetchDashboardData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete resume';
      showToast(msg, 'error');
    }
  };

  // Handle saving broadcast banner
  const handleSaveBroadcast = async (e) => {
    e.preventDefault();
    try {
      const headers = getAuthHeader();
      await axios.post(`${config.API_BASE_URL}/admin/broadcast`, {
        message: broadcast.message,
        type: broadcast.type || 'info',
        active: Boolean(broadcast.active)
      }, { headers });

      showToast('Platform announcement updated and deployed live!', 'success');
      fetchDashboardData();
    } catch (err) {
      showToast('Failed to update platform broadcast.', 'error');
    }
  };

  // Handle deactivating broadcast
  const handleClearBroadcast = async () => {
    try {
      const headers = getAuthHeader();
      await axios.delete(`${config.API_BASE_URL}/admin/broadcast`, { headers });
      setBroadcast({ message: '', type: 'info', active: false });
      showToast('Platform broadcast banner deactivated.', 'success');
    } catch (err) {
      showToast('Failed to clear broadcast banner.', 'error');
    }
  };

  // Handle feature status toggle
  const handleFeatureStatusChange = (featureId, newStatus) => {
    setFeatures(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        status: newStatus
      }
    }));
  };

  // Handle setting all features to Public (Free for All)
  const handleMakeAllFeaturesPublic = () => {
    setFeatures(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        updated[k] = { ...updated[k], status: 'public' };
      });
      return updated;
    });
    showToast('All features set to Public (Free for All)! Click "Deploy Feature Flags" to save.', 'info');
  };

  // Save feature flags to MongoDB
  const handleSaveFeatures = async () => {
    setFeaturesSaving(true);
    try {
      const headers = getAuthHeader();
      await axios.post(`${config.API_BASE_URL}/admin/features`, { features }, { headers });
      showToast('Platform feature flags deployed live to all users!', 'success');
      fetchDashboardData();
    } catch (err) {
      showToast('Failed to deploy feature flags', 'error');
    } finally {
      setFeaturesSaving(false);
    }
  };

  // Handle master password update
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const headers = getAuthHeader();
      await axios.post(`${config.API_BASE_URL}/auth/change-password`, {
        old_password: currentPassword || undefined,
        new_password: newPassword
      }, { headers });

      showToast('Master Admin Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login', { replace: true });
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
  });

  // Filtered resumes
  const filteredResumes = resumes.filter(r => {
    if (!resumeSearch.trim()) return true;
    const q = resumeSearch.toLowerCase();
    return (
      (r.candidate_name && r.candidate_name.toLowerCase().includes(q)) ||
      (r.candidate_email && r.candidate_email.toLowerCase().includes(q)) ||
      (r.target_role && r.target_role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-db-container">
      {/* Top Navbar */}
      <nav className="admin-navbar">
        <div className="admin-nav-brand">
          <div className="admin-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="admin-nav-title">
            LokuResume Control Center
            <span className="admin-role-badge">Superadmin</span>
          </span>
        </div>

        <div className="admin-nav-actions">
          <div className="admin-user-pill">
            <span>🛡️</span>
            <span>{user?.email || 'admin@lokiresume.com'}</span>
          </div>

          <Link to="/dashboard" className="admin-btn-secondary" title="View User Dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span>User Portal</span>
          </Link>

          <button onClick={handleLogout} className="admin-btn-logout" title="Sign out of Admin Portal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className="admin-body">
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>System Overview</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Users ({users.length})</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'resumes' ? 'active' : ''}`}
            onClick={() => setActiveTab('resumes')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Resumes ({resumes.length})</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Feature Controls ({Object.keys(features).length || 6})</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcast')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>Platform Alert {broadcast?.active ? '🟢' : ''}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Master Settings</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">Platform Intelligence Overview</h2>
                  <p className="admin-section-subtitle">Real-time telemetry and database operational metrics</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="admin-btn-secondary"
                  disabled={refreshing}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">Total Users</span>
                    <span className="admin-stat-value">{stats?.total_users ?? users.length}</span>
                    <span className="admin-stat-sub">
                      {stats?.new_users_24h !== undefined ? `+${stats.new_users_24h} today • +${stats.new_users_7d} this wk` : `${stats?.admin_users ?? 1} Superadmin`}
                    </span>
                  </div>
                  <div className="admin-stat-icon blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">Resumes Created</span>
                    <span className="admin-stat-value">{stats?.total_resumes ?? resumes.length}</span>
                    <span className="admin-stat-sub">
                      {stats?.new_resumes_24h !== undefined ? `+${stats.new_resumes_24h} today • +${stats.new_resumes_7d} this wk` : 'Across All Templates'}
                    </span>
                  </div>
                  <div className="admin-stat-icon purple">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">Avg ATS Score</span>
                    <span className="admin-stat-value">{stats?.avg_ats_score ?? 0}%</span>
                    <span className="admin-stat-sub">Peak ATS: {stats?.highest_score ?? 0}%</span>
                  </div>
                  <div className="admin-stat-icon green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">Feature Switches</span>
                    <span className="admin-stat-value" style={{ fontSize: '1.35rem' }}>
                      {stats?.features_summary ? `${stats.features_summary.public} Public` : '6 Active'}
                    </span>
                    <span className="admin-stat-sub">
                      {stats?.features_summary ? `${stats.features_summary.premium} Pro • ${stats.features_summary.disabled} Paused` : 'Admin Controlled'}
                    </span>
                  </div>
                  <div className="admin-stat-icon purple">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-info">
                    <span className="admin-stat-label">Global Alert</span>
                    <span className="admin-stat-value" style={{ fontSize: '1.35rem' }}>
                      {broadcast?.active ? 'Active' : 'Disabled'}
                    </span>
                    <span className="admin-stat-sub">{broadcast?.active ? 'Live across app' : 'No banner active'}</span>
                  </div>
                  <div className="admin-stat-icon red">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="admin-health-panel">
                <div className="admin-health-item">
                  <div className="admin-pulse-dot"></div>
                  <div className="admin-health-text">
                    <h4>MongoDB Atlas Cloud Database</h4>
                    <p>Primary Cluster: Connected & Synchronized</p>
                  </div>
                </div>
                <div className="admin-health-item">
                  <div className="admin-pulse-dot"></div>
                  <div className="admin-health-text">
                    <h4>FastAPI Python High-Speed Engine</h4>
                    <p>CORS, JWT & ATS Scoring Operational</p>
                  </div>
                </div>
                <div className="admin-health-item">
                  <div className="admin-pulse-dot"></div>
                  <div className="admin-health-text">
                    <h4>Gemini AI Intelligence Layer</h4>
                    <p>Multilingual Assistant & Auto-Review Online</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">User Accounts Control</h2>
                  <p className="admin-section-subtitle">Manage all registered accounts, view resumes, or remove users</p>
                </div>
                <div className="admin-badge-count">Total: {users.length} Users</div>
              </div>

              <div className="admin-table-controls">
                <div className="admin-search-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-card">
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User Profile</th>
                        <th>Role</th>
                        <th>Resumes</th>
                        <th>Registered Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="admin-empty-state">
                            No users found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSuperAdmin = u.role === 'admin';
                          const initial = (u.name || u.email || 'U')[0].toUpperCase();
                          const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';

                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="admin-user-cell">
                                  <div className={`admin-avatar ${isSuperAdmin ? 'admin-user' : ''}`}>
                                    {initial}
                                  </div>
                                  <div>
                                    <div className="admin-user-name">{u.name}</div>
                                    <div className="admin-user-email">{u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`admin-tag-role ${u.role || 'user'}`}>
                                  {u.role || 'user'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: '#ffffff' }}>{u.resume_count ?? 0}</strong>
                              </td>
                              <td style={{ color: '#94a3b8' }}>{dateStr}</td>
                              <td>
                                {!isSuperAdmin ? (
                                  <button
                                    className="admin-action-btn delete"
                                    onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                                    title="Delete User and All Associated Resumes"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>Delete</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Protected (Admin)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESUMES CONTROL */}
          {activeTab === 'resumes' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">Resume Repository</h2>
                  <p className="admin-section-subtitle">Full master list of all resumes across the entire platform</p>
                </div>
                <div className="admin-badge-count">Total: {resumes.length} Resumes</div>
              </div>

              <div className="admin-table-controls">
                <div className="admin-search-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search candidate name, email, or role..."
                    value={resumeSearch}
                    onChange={(e) => setResumeSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-table-card">
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Target Role</th>
                        <th>ATS Score</th>
                        <th>Template</th>
                        <th>Last Modified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResumes.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="admin-empty-state">
                            No resumes found matching your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredResumes.map((r) => {
                          const score = r.score ?? 0;
                          const scoreClass = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
                          const updateStr = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent';

                          return (
                            <tr key={r.id}>
                              <td>
                                <div>
                                  <div className="admin-user-name">{r.candidate_name || 'Untitled Candidate'}</div>
                                  <div className="admin-user-email">{r.candidate_email || r.owner_email || 'No email'}</div>
                                </div>
                              </td>
                              <td style={{ color: '#cbd5e1' }}>{r.target_role || 'General'}</td>
                              <td>
                                <span className={`admin-score-badge ${scoreClass}`}>
                                  <span>★</span>
                                  <span>{score}%</span>
                                </span>
                              </td>
                              <td style={{ color: '#94a3b8', textTransform: 'capitalize' }}>
                                {r.template_id || 'Modern'}
                              </td>
                              <td style={{ color: '#64748b' }}>{updateStr}</td>
                              <td>
                                <button
                                  className="admin-action-btn delete"
                                  onClick={() => handleDeleteResume(r.id, r.candidate_name || 'this resume')}
                                  title="Permanently remove resume"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FEATURE CONTROLS */}
          {activeTab === 'features' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">Platform Feature Master Controls</h2>
                  <p className="admin-section-subtitle">
                    Control which premium features are 100% Free/Public for all users, locked behind VIP Pro, or paused for maintenance.
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="admin-feature-actions-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚡</span>
                  <div>
                    <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>Instant Feature Access Controls</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                      Toggle any feature to Public (Free for all users) or Premium (Pro VIP). Saves directly into MongoDB Atlas.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleMakeAllFeaturesPublic}
                    className="admin-btn-secondary"
                    title="Unlock every feature for free for all platform users"
                  >
                    <span>🟢 Make All Public (Free)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveFeatures}
                    className="admin-btn-primary"
                    disabled={featuresSaving}
                  >
                    {featuresSaving ? (
                      <>
                        <span className="admin-btn-spinner"></span>
                        <span>Deploying Changes...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        <span>Deploy Feature Flags</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div className="admin-features-grid">
                {Object.entries(features).length === 0 ? (
                  <div className="admin-empty-state" style={{ gridColumn: '1 / -1' }}>
                    Loading feature flags from cloud database...
                  </div>
                ) : (
                  Object.entries(features).map(([featId, feat]) => {
                    const status = feat.status || 'public';
                    return (
                      <div key={featId} className={`admin-feature-card status-${status}`}>
                        <div>
                          <div className="admin-feature-header">
                            <div className="admin-feature-meta">
                              <span className="admin-feature-icon">{feat.icon || '✨'}</span>
                              <div className="admin-feature-title-box">
                                <h4>{feat.name}</h4>
                                <span className="admin-feature-category">{feat.category || 'Feature'}</span>
                              </div>
                            </div>
                            <span className={`admin-feature-badge-pill badge-${status}`}>
                              {status === 'public' ? 'Free for All' : status === 'premium' ? 'Pro VIP' : 'Disabled'}
                            </span>
                          </div>

                          <p className="admin-feature-desc">{feat.description}</p>
                        </div>

                        {/* 3-Way Toggle Button Group */}
                        <div className="admin-toggle-group">
                          <button
                            type="button"
                            className={`admin-toggle-btn btn-public ${status === 'public' ? 'active' : ''}`}
                            onClick={() => handleFeatureStatusChange(featId, 'public')}
                            title="Make this feature 100% free and open for all users"
                          >
                            <span>🟢</span>
                            <span>Public (Free)</span>
                          </button>

                          <button
                            type="button"
                            className={`admin-toggle-btn btn-premium ${status === 'premium' ? 'active' : ''}`}
                            onClick={() => handleFeatureStatusChange(featId, 'premium')}
                            title="Restrict this feature to Premium / VIP tier"
                          >
                            <span>💎</span>
                            <span>Pro VIP</span>
                          </button>

                          <button
                            type="button"
                            className={`admin-toggle-btn btn-disabled ${status === 'disabled' ? 'active' : ''}`}
                            onClick={() => handleFeatureStatusChange(featId, 'disabled')}
                            title="Temporarily pause or disable this feature"
                          >
                            <span>⚪</span>
                            <span>Disabled</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BROADCAST ALERT */}
          {activeTab === 'broadcast' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">Platform Broadcast Banner</h2>
                  <p className="admin-section-subtitle">
                    Publish instant notifications, updates, or maintenance alerts visible to all users across the app
                  </p>
                </div>
              </div>

              <div className="admin-broadcast-card">
                <form onSubmit={handleSaveBroadcast}>
                  <div className="admin-form-group">
                    <label htmlFor="broadcast-msg">Announcement Message</label>
                    <textarea
                      id="broadcast-msg"
                      className="admin-textarea"
                      placeholder="e.g. 🚀 Welcome to LokuResume AI! New ATS templates and Gemini AI voice support are now live."
                      value={broadcast.message || ''}
                      onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="broadcast-type">Banner Theme / Style</label>
                    <select
                      id="broadcast-type"
                      className="admin-select"
                      value={broadcast.type || 'info'}
                      onChange={(e) => setBroadcast({ ...broadcast, type: e.target.value })}
                    >
                      <option value="info">ℹ️ Informational (Blue)</option>
                      <option value="success">🎉 Success / New Feature (Emerald Green)</option>
                      <option value="warning">⚠️ Warning / Maintenance (Amber)</option>
                      <option value="alert">🚨 Urgent Alert / Notice (Crimson Red)</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-toggle-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(broadcast.active)}
                        onChange={(e) => setBroadcast({ ...broadcast, active: e.target.checked })}
                      />
                      <span>Make this banner live on user screens right now</span>
                    </label>
                  </div>

                  {/* Live Banner Preview */}
                  {broadcast.message && (
                    <div className="admin-form-group">
                      <label>Live Preview:</label>
                      <div className={`admin-broadcast-preview ${broadcast.type || 'info'}`}>
                        <span>📢</span>
                        <span>{broadcast.message}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="admin-btn-primary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      <span>Deploy Announcement</span>
                    </button>

                    {broadcast.active && (
                      <button
                        type="button"
                        onClick={handleClearBroadcast}
                        className="admin-btn-secondary"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      >
                        <span>Disable & Clear Banner</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: MASTER SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <div className="admin-header-row">
                <div>
                  <h2 className="admin-section-title">Master Administrator Security Settings</h2>
                  <p className="admin-section-subtitle">Change superadmin password and view platform environment details</p>
                </div>
              </div>

              {/* Password Change Card */}
              <div className="admin-settings-card">
                <h3 style={{ margin: '0 0 1rem 0', color: '#ffffff', fontSize: '1.15rem' }}>
                  🔑 Change Master Password
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Update the master secret key used to access this Command Center.
                </p>

                <form onSubmit={handleChangePassword}>
                  <div className="admin-form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      className="admin-search-input"
                      placeholder="Enter current master password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>New Secret Password</label>
                    <input
                      type="password"
                      className="admin-search-input"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Confirm New Secret Password</label>
                    <input
                      type="password"
                      className="admin-search-input"
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="admin-btn-primary"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating Password...' : 'Save New Master Password'}
                  </button>
                </form>
              </div>

              {/* Platform Info */}
              <div className="admin-settings-card">
                <h3 style={{ margin: '0 0 1rem 0', color: '#ffffff', fontSize: '1.15rem' }}>
                  🛡️ Master Administrator Credentials
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Admin Email: </span>
                    <strong style={{ color: '#ffffff' }}>{user?.email || 'admin@lokiresume.com'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Role Level: </span>
                    <strong style={{ color: '#fda4af' }}>Master Superadministrator (Full Access)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>API Gateway: </span>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                      {config.API_BASE_URL}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;

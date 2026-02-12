import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config';
import '../styles/Dashboard.css';

function Dashboard() {
      const [resumes, setResumes] = useState([]);
      const [loading, setLoading] = useState(true);
      const { user, logout, getAuthHeader } = useAuth();
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
                  setLoading(false);
            }
      };

      const handleDelete = async (id) => {
            if (!confirm('Are you sure you want to delete this resume?')) return;

            try {
                  await axios.delete(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });
                  fetchResumes();
            } catch (error) {
                  alert('Failed to delete resume');
            }
      };

      const handleDuplicate = async (id) => {
            try {
                  await axios.post(`${config.API_BASE_URL}/resumes/${id}/duplicate`, {}, {
                        headers: getAuthHeader()
                  });
                  fetchResumes();
            } catch (error) {
                  alert(error.response?.data?.detail || 'Failed to duplicate resume');
            }
      };

      const handleDownload = async (id, name) => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}/download`, {
                        headers: getAuthHeader(),
                        responseType: 'blob'
                  });

                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `${name}_Resume.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
            } catch (error) {
                  alert('Failed to generate PDF');
            }
      };

      const getScoreColor = (score) => {
            if (score < 50) return 'score-red';
            if (score < 65) return 'score-orange';
            return 'score-green';
      };

      return (
            <div className="dashboard">
                  <nav className="dashboard-nav">
                        <h2>{config.APP_NAME}</h2>
                        <div className="nav-right">
                              <span>Welcome, {user?.name}</span>
                              <button onClick={logout} className="btn btn-secondary">Logout</button>
                        </div>
                  </nav>

                  <div className="dashboard-container">
                        <div className="dashboard-header">
                              <h1>My Resumes</h1>
                              <Link to="/resume/create" className="btn btn-primary">+ Create New Resume</Link>
                        </div>

                        {loading ? (
                              <div className="loading">Loading resumes...</div>
                        ) : resumes.length === 0 ? (
                              <div className="empty-state">
                                    <h3>No resumes yet</h3>
                                    <p>Create your first AI-powered resume to get started!</p>
                                    <Link to="/resume/create" className="btn btn-primary">Create Resume</Link>
                              </div>
                        ) : (
                              <div className="resumes-grid">
                                    {resumes.map((resume) => (
                                          <div key={resume.id} className="resume-card">
                                                <div className="resume-card-header">
                                                      <h3>{resume.personal_info.name}</h3>
                                                      <span className={`score-badge ${getScoreColor(resume.score)}`}>
                                                            {resume.score}%
                                                      </span>
                                                </div>

                                                <p className="resume-email">{resume.personal_info.email}</p>

                                                <div className="resume-stats">
                                                      <div className="stat-item">
                                                            <span className="stat-label">Skills:</span>
                                                            <span className="stat-value">{resume.skills.length}</span>
                                                      </div>
                                                      <div className="stat-item">
                                                            <span className="stat-label">Projects:</span>
                                                            <span className="stat-value">{resume.projects.length}</span>
                                                      </div>
                                                </div>

                                                {resume.score < 65 && (
                                                      <div className="resume-locked">
                                                            🔒 Score 65%+ to unlock advanced features
                                                      </div>
                                                )}

                                                <div className="resume-actions">
                                                      <button
                                                            onClick={() => navigate(`/resume/edit/${resume.id}`)}
                                                            className="btn btn-sm btn-secondary"
                                                      >
                                                            Edit
                                                      </button>
                                                      <button
                                                            onClick={() => handleDownload(resume.id, resume.personal_info.name)}
                                                            className="btn btn-sm btn-primary"
                                                      >
                                                            Download PDF
                                                      </button>
                                                      {resume.score >= 65 && (
                                                            <button
                                                                  onClick={() => handleDuplicate(resume.id)}
                                                                  className="btn btn-sm btn-success"
                                                            >
                                                                  Duplicate
                                                            </button>
                                                      )}
                                                      <button
                                                            onClick={() => handleDelete(resume.id)}
                                                            className="btn btn-sm btn-danger"
                                                      >
                                                            Delete
                                                      </button>
                                                </div>
                                          </div>
                                    ))}
                              </div>
                        )}
                  </div>
            </div>
      );
}

export default Dashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import ResumePreview from '../components/ResumePreview';
import axios from 'axios';
import config from '../config';
import '../styles/ResumeBuilder.css';
import '../styles/ResumeBuilderExtra.css';

const POPULAR_SKILLS = [
      'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'FastAPI',
      'Docker', 'AWS', 'PostgreSQL', 'MongoDB', 'Redis', 'Git', 'Next.js',
      'GraphQL', 'Tailwind CSS', 'CI/CD', 'REST APIs', 'Kubernetes'
];

function ResumeBuilder() {
      const { id } = useParams();
      const { getAuthHeader } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      const [currentStep, setCurrentStep] = useState(1);
      const [loading, setLoading] = useState(false);
      const [score, setScore] = useState(null);
      const [showPreview, setShowPreview] = useState(false);
      const [showATSModal, setShowATSModal] = useState(false);

      // Inline skill input state
      const [skillInput, setSkillInput] = useState('');

      // AI Bullet Generator state
      const [aiTarget, setAiTarget] = useState(null); // { type: 'project'|'experience', index }
      const [aiLoading, setAiLoading] = useState(false);
      const [aiVariations, setAiVariations] = useState([]);

      const [formData, setFormData] = useState(() => {
            const savedData = localStorage.getItem('resume_draft');
            if (savedData && !id) {
                  try {
                        return JSON.parse(savedData);
                  } catch (e) {
                        // ignore parsing error
                  }
            }
            return {
                  personal_info: {
                        name: '',
                        email: '',
                        phone: '',
                        linkedin: '',
                        github: '',
                        leetcode: '',
                        problem_solving: '',
                        portfolio: '',
                        headline: '',
                        profile_photo: ''
                  },
                  coding_profiles: [],
                  summary: '',
                  education: [],
                  skills: [],
                  projects: [],
                  experience: [],
                  certifications: [],
                  achievements: [],
                  template_style: 'modern',
                  pdf_preferences: {
                        background_color: '#ffffff',
                        accent_color: '#4f46e5'
                  }
            };
      });

      useEffect(() => {
            if (id) {
                  fetchResume();
            }
      }, [id]);

      useEffect(() => {
            if (!id) {
                  localStorage.setItem('resume_draft', JSON.stringify(formData));
            }
      }, [formData, id]);

      // Calculate Live ATS Readiness Score
      const liveATSScore = useMemo(() => {
            let pts = 0;
            const p = formData.personal_info || {};
            if (p.name && p.email) pts += 15;
            if (p.phone) pts += 5;
            if (p.headline) pts += 10;
            if (p.linkedin || p.github || p.portfolio) pts += 5;
            if (formData.summary && formData.summary.trim().split(/\s+/).filter(Boolean).length >= 25) pts += 15;
            if (formData.education && formData.education.length > 0 && formData.education[0].degree) pts += 10;
            if (formData.skills && formData.skills.length >= 4) pts += 15;
            if (formData.projects && formData.projects.length > 0 && formData.projects[0].title) pts += 15;
            if (formData.experience && formData.experience.length > 0 && formData.experience[0].company) pts += 5;
            if ((formData.certifications && formData.certifications.length > 0) || (formData.achievements && formData.achievements.length > 0)) pts += 5;
            return Math.min(100, pts);
      }, [formData]);

      const fetchResume = async () => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });

                  const data = response.data;
                  if (data.certifications && data.certifications.length > 0) {
                        data.certifications = data.certifications.map(cert => {
                              if (typeof cert === 'string') {
                                    return { name: cert, file_data: '', file_url: '', issued_by: '', date: '' };
                              }
                              return cert;
                        });
                  }

                  if (!data.pdf_preferences) {
                        data.pdf_preferences = {
                              background_color: '#ffffff',
                              accent_color: '#4f46e5'
                        };
                  }
                  if (!data.template_style) {
                        data.template_style = 'modern';
                  }

                  setFormData(data);
                  setScore(data.score);
            } catch (error) {
                  showToast('Failed to load resume details', 'error');
            }
      };

      const handleSave = async () => {
            if (!formData.personal_info?.name || !formData.personal_info?.email) {
                  showToast('Please enter your Name and Email in Step 1 before saving', 'warning');
                  setCurrentStep(1);
                  return;
            }

            setLoading(true);
            try {
                  if (id) {
                        const response = await axios.put(`${config.API_BASE_URL}/resumes/${id}`, formData, {
                              headers: getAuthHeader()
                        });
                        setScore(response.data.score);
                        showToast('Resume updated successfully!', 'success');
                  } else {
                        const response = await axios.post(`${config.API_BASE_URL}/resumes`, formData, {
                              headers: getAuthHeader()
                        });
                        const newId = response.data.id;
                        setScore(response.data.score);
                        showToast('Resume saved successfully!', 'success');
                        localStorage.removeItem('resume_draft');

                        if (newId) {
                              navigate(`/resume/edit/${newId}`);
                        }
                  }
            } catch (error) {
                  console.error('Save Resume Error:', error);
                  showToast(error.response?.data?.detail || 'Failed to save resume', 'error');
            } finally {
                  setLoading(false);
            }
      };

      // 1-Click Auto-fill Sample Data
      const handleAutoFill = () => {
            setFormData({
                  personal_info: {
                        name: 'Alex Morgan',
                        email: 'alex.morgan@example.com',
                        phone: '+1 (555) 234-5678',
                        linkedin: 'https://linkedin.com/in/alexmorgan',
                        github: 'https://github.com/alexmorgan',
                        leetcode: 'https://leetcode.com/alexmorgan',
                        problem_solving: 'https://hackerrank.com/alexmorgan',
                        portfolio: 'https://alexmorgan.dev',
                        headline: 'Senior Full-Stack Software Engineer | Distributed Systems',
                        profile_photo: formData.personal_info?.profile_photo || ''
                  },
                  coding_profiles: [
                        { platform: 'LeetCode', link: 'https://leetcode.com/alexmorgan', headline: 'Knight Rank (2150 Rating) | 650+ Solved' },
                        { platform: 'GitHub', link: 'https://github.com/alexmorgan', headline: '1,200+ Contributions in 2025' }
                  ],
                  summary: 'Accomplished Senior Full-Stack Engineer with 5+ years of experience architecting high-throughput microservices, real-time data pipelines, and responsive web platforms. Proven track record reducing API latency by 45% and cutting AWS infrastructure costs by 30%.',
                  education: [
                        { degree: 'B.S. in Computer Science', college: 'University of California, Berkeley', year: '2016 - 2020', grade: '3.9 GPA' }
                  ],
                  skills: ['React.js', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis', 'Tailwind CSS', 'CI/CD', 'REST APIs'],
                  projects: [
                        {
                              title: 'AI Resume & Career Engine',
                              technologies: 'React, FastAPI, MongoDB, OpenAI API',
                              description: 'Architected an automated career platform serving 15,000+ engineers with instant ATS scoring and real-time bullet enhancement.',
                              repository_url: 'https://github.com/alexmorgan/resume-ai',
                              live_demo_url: 'https://resume-ai-demo.com'
                        },
                        {
                              title: 'Real-Time Telemetry Observability',
                              technologies: 'Node.js, TypeScript, Redis Streams, Docker',
                              description: 'Engineered a real-time event streaming pipeline handling 30,000 telemetry events/sec with sub-15ms dashboard chart rendering.'
                        }
                  ],
                  experience: [
                        {
                              company: 'Apex Digital Systems',
                              role: 'Senior Full-Stack Engineer',
                              duration: '2022 - Present',
                              description: 'Spearheaded modern cloud architecture across 14 microservices. Mentored 6 junior engineers and improved team sprint velocity by 25%.'
                        },
                        {
                              company: 'NextGen Cloud Labs',
                              role: 'Software Engineer',
                              duration: '2020 - 2022',
                              description: 'Engineered backend REST endpoints in Python & FastAPI with 99.98% uptime SLA. Built automated test suites achieving 92% coverage.'
                        }
                  ],
                  certifications: [
                        { name: 'AWS Certified Solutions Architect', issued_by: 'Amazon Web Services', date: '2023', file_data: '', file_url: '' }
                  ],
                  achievements: [
                        { title: '1st Place Winner - Silicon Valley Hackathon', description: 'Built an AI accessibility tool selected #1 out of 160 global teams.', date: '2023', link: '' }
                  ],
                  template_style: formData.template_style || 'modern',
                  pdf_preferences: formData.pdf_preferences || { background_color: '#ffffff', accent_color: '#4f46e5' }
            });
            showToast('Loaded complete sample resume data!', 'success');
      };

      const nextStep = () => { if (currentStep < 10) setCurrentStep(currentStep + 1); };
      const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

      // Reorder items in lists (Move Up / Down)
      const moveItem = (listName, index, direction) => {
            const list = [...(formData[listName] || [])];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;
            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;
            setFormData({ ...formData, [listName]: list });
      };

      // AI Bullet Generator Trigger
      const handleAIEnhanceBullet = async (type, index, text) => {
            if (!text || !text.trim()) {
                  showToast('Please type a brief description first to enhance with AI', 'warning');
                  return;
            }

            setAiTarget({ type, index });
            setAiLoading(true);
            setAiVariations([]);

            try {
                  const response = await axios.post(`${config.API_BASE_URL}/ai/enhance-bullet`, {
                        text: text,
                        context: type
                  });
                  setAiVariations(response.data.variations);
                  showToast('Generated 3 AI bullet options!', 'info');
            } catch (error) {
                  showToast('AI generation failed', 'error');
            } finally {
                  setAiLoading(false);
            }
      };

      const applyAIVariation = (variationText) => {
            if (!aiTarget) return;

            if (aiTarget.type === 'project') {
                  updateProject(aiTarget.index, 'description', variationText);
            } else if (aiTarget.type === 'experience') {
                  updateExperience(aiTarget.index, 'description', variationText);
            }

            showToast('Applied AI bullet point!', 'success');
            setAiTarget(null);
            setAiVariations([]);
      };

      const handlePhotoUpload = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                  if (file.size > 2 * 1024 * 1024) {
                        showToast('Photo size should be less than 2MB', 'warning');
                        return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                        setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, profile_photo: reader.result }
                        });
                  };
                  reader.readAsDataURL(file);
            } else {
                  showToast('Please select a valid image file', 'warning');
            }
      };

      // Repeatable field handlers
      const addEducation = () => {
            setFormData({
                  ...formData,
                  education: [...(formData.education || []), { degree: '', college: '', year: '', grade: '' }]
            });
      };
      const updateEducation = (index, field, value) => {
            const newEducation = [...(formData.education || [])];
            if (newEducation[index]) {
                  newEducation[index] = { ...newEducation[index], [field]: value };
                  setFormData({ ...formData, education: newEducation });
            }
      };
      const removeEducation = (index) => {
            setFormData({ ...formData, education: (formData.education || []).filter((_, i) => i !== index) });
      };

      // Skills handlers
      const handleAddSkill = (skillToAdd) => {
            const skill = (skillToAdd || skillInput).trim();
            const currentSkills = formData.skills || [];
            if (skill) {
                  if (currentSkills.includes(skill)) {
                        showToast('Skill already added', 'info');
                  } else {
                        setFormData({ ...formData, skills: [...currentSkills, skill] });
                        setSkillInput('');
                  }
            }
      };
      const removeSkill = (index) => {
            setFormData({ ...formData, skills: (formData.skills || []).filter((_, i) => i !== index) });
      };

      // Projects handlers
      const addProject = () => {
            setFormData({
                  ...formData,
                  projects: [...(formData.projects || []), { title: '', technologies: '', description: '', repository_url: '', live_demo_url: '' }]
            });
      };
      const updateProject = (index, field, value) => {
            const newProjects = [...(formData.projects || [])];
            if (newProjects[index]) {
                  newProjects[index] = { ...newProjects[index], [field]: value };
                  setFormData({ ...formData, projects: newProjects });
            }
      };
      const removeProject = (index) => {
            setFormData({ ...formData, projects: (formData.projects || []).filter((_, i) => i !== index) });
      };

      // Experience handlers
      const addExperience = () => {
            setFormData({
                  ...formData,
                  experience: [...(formData.experience || []), { company: '', role: '', duration: '', description: '' }]
            });
      };
      const updateExperience = (index, field, value) => {
            const newExperience = [...(formData.experience || [])];
            if (newExperience[index]) {
                  newExperience[index] = { ...newExperience[index], [field]: value };
                  setFormData({ ...formData, experience: newExperience });
            }
      };
      const removeExperience = (index) => {
            setFormData({ ...formData, experience: (formData.experience || []).filter((_, i) => i !== index) });
      };

      // Certifications handlers
      const addCertification = () => {
            setFormData({
                  ...formData,
                  certifications: [...(formData.certifications || []), { name: '', file_data: '', file_url: '', issued_by: '', date: '' }]
            });
      };
      const updateCertification = (index, field, value) => {
            const newCerts = [...(formData.certifications || [])];
            if (newCerts[index]) {
                  newCerts[index] = { ...newCerts[index], [field]: value };
                  setFormData({ ...formData, certifications: newCerts });
            }
      };
      const removeCertification = (index) => {
            setFormData({ ...formData, certifications: (formData.certifications || []).filter((_, i) => i !== index) });
      };

      // Achievements handlers
      const addAchievement = () => {
            setFormData({
                  ...formData,
                  achievements: [...(formData.achievements || []), { title: '', description: '', date: '', link: '' }]
            });
      };
      const updateAchievement = (index, field, value) => {
            const newAchievements = [...(formData.achievements || [])];
            if (newAchievements[index]) {
                  newAchievements[index] = { ...newAchievements[index], [field]: value };
                  setFormData({ ...formData, achievements: newAchievements });
            }
      };
      const removeAchievement = (index) => {
            setFormData({ ...formData, achievements: (formData.achievements || []).filter((_, i) => i !== index) });
      };

      // Coding Profiles handlers
      const addCodingProfile = () => {
            setFormData({
                  ...formData,
                  coding_profiles: [...(formData.coding_profiles || []), { platform: '', link: '', headline: '' }]
            });
      };
      const updateCodingProfile = (index, field, value) => {
            const newProfiles = [...(formData.coding_profiles || [])];
            if (newProfiles[index]) {
                  newProfiles[index] = { ...newProfiles[index], [field]: value };
                  setFormData({ ...formData, coding_profiles: newProfiles });
            }
      };
      const removeCodingProfile = (index) => {
            setFormData({ ...formData, coding_profiles: (formData.coding_profiles || []).filter((_, i) => i !== index) });
      };

      const stepsList = [
            { num: 1, label: '👤 Personal' },
            { num: 2, label: '📝 Summary' },
            { num: 3, label: '🎓 Education' },
            { num: 4, label: '💼 Skills' },
            { num: 5, label: '🚀 Projects' },
            { num: 6, label: '💻 Experience' },
            { num: 7, label: '📜 Certs' },
            { num: 8, label: '🏆 Awards' },
            { num: 9, label: '👨‍💻 Profiles' },
            { num: 10, label: '👀 Review' },
      ];

      const colorPresets = [
            { name: 'Indigo', color: '#4f46e5' },
            { name: 'Emerald', color: '#10b981' },
            { name: 'Purple', color: '#8b5cf6' },
            { name: 'Slate', color: '#334155' },
            { name: 'Crimson', color: '#dc2626' }
      ];

      return (
            <div className="resume-builder">
                  {/* Top Builder Bar */}
                  <div className="builder-header">
                        <div className="header-left-col">
                              <div className="title-row">
                                    <h1>{id ? '✏️ Edit Resume' : '✨ Create Resume'}</h1>
                                    <span className="live-score-pill" title="Real-time estimated ATS score">
                                          🎯 ATS Ready: <strong>{liveATSScore}%</strong>
                                    </span>
                              </div>
                              <div className="live-score-bar-track">
                                    <div
                                          className={`live-score-bar-fill ${liveATSScore < 50 ? 'bar-red' : liveATSScore < 70 ? 'bar-orange' : 'bar-green'}`}
                                          style={{ width: `${liveATSScore}%` }}
                                    />
                              </div>
                        </div>

                        <div className="header-actions">
                              <button onClick={handleAutoFill} type="button" className="btn btn-secondary btn-sm" title="Fill all fields with sample profile">
                                    ⚡ Sample Data
                              </button>
                              <button onClick={() => setShowATSModal(true)} type="button" className="btn btn-secondary btn-sm">
                                    🎯 ATS Matcher
                              </button>
                              <button onClick={() => setShowPreview(true)} type="button" className="btn btn-primary btn-sm">
                                    👁️ Preview
                              </button>
                              <button onClick={handleSave} disabled={loading} type="button" className="btn btn-success btn-sm">
                                    {loading ? 'Saving...' : '💾 Save'}
                              </button>
                              <button onClick={() => navigate('/dashboard')} type="button" className="btn btn-secondary btn-sm">
                                    Dashboard
                              </button>
                        </div>
                  </div>

                  {/* PDF & Template Style Customization */}
                  <div className="pdf-customization">
                        <h4>🎨 Template &amp; Design Styling</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <div>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Resume Layout Template:</label>
                                    <div className="template-selector-grid">
                                          {[
                                                { id: 'modern', name: 'Modern Minimal' },
                                                { id: 'executive', name: 'Executive' },
                                                { id: 'tech', name: 'Tech Developer' },
                                                { id: 'compact', name: 'Compact 1-Page' }
                                          ].map(tpl => (
                                                <div
                                                      key={tpl.id}
                                                      className={`template-card-option ${formData.template_style === tpl.id ? 'selected' : ''}`}
                                                      onClick={() => setFormData({ ...formData, template_style: tpl.id })}
                                                >
                                                      {tpl.name}
                                                </div>
                                          ))}
                                    </div>
                              </div>

                              <div className="color-pickers">
                                    <div className="color-picker-group">
                                          <label>Accent Color:</label>
                                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {colorPresets.map(p => (
                                                      <span
                                                            key={p.color}
                                                            onClick={() => setFormData({
                                                                  ...formData,
                                                                  pdf_preferences: { ...formData.pdf_preferences, accent_color: p.color }
                                                            })}
                                                            style={{
                                                                  width: 24, height: 24, borderRadius: '50%', background: p.color, cursor: 'pointer',
                                                                  border: formData.pdf_preferences?.accent_color === p.color ? '2px solid var(--text-main)' : 'none'
                                                            }}
                                                      />
                                                ))}
                                                <input
                                                      type="color"
                                                      value={formData.pdf_preferences?.accent_color || '#4f46e5'}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            pdf_preferences: { ...formData.pdf_preferences, accent_color: e.target.value }
                                                      })}
                                                />
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </div>

                  {/* Saved Score Indicator (if saved) */}
                  {score !== null && (
                        <div className="score-display">
                              <h3>Saved ATS Optimization Score: <span className={score < 50 ? 'red' : score < 65 ? 'orange' : 'green'}>{score}%</span></h3>
                              {score < 65 ? (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔒 Reach 65%+ to unlock duplication &amp; advanced options</span>
                              ) : (
                                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>🎉 Unlocked All Features!</span>
                              )}
                        </div>
                  )}

                  {/* Stepper Bar */}
                  <div className="progress-bar">
                        {stepsList.map((step) => (
                              <div
                                    key={step.num}
                                    className={`progress-step ${currentStep >= step.num ? 'active' : ''}`}
                                    onClick={() => setCurrentStep(step.num)}
                                    title={step.label}
                                    style={{ cursor: 'pointer' }}
                              >
                                    <span className="step-badge-num">{step.num}</span>
                                    <span className="step-badge-label">{step.label.split(' ')[1]}</span>
                              </div>
                        ))}
                  </div>

                  {/* Builder Steps */}
                  <div className="builder-form">
                        {/* Step 1: Personal Info */}
                        {currentStep === 1 && (
                              <div className="form-step fade-in">
                                    <h2>👤 Step 1: Personal Information</h2>
                                    <p className="step-description">Add your contact details and professional links</p>

                                    <div className="form-group">
                                          <label>Profile Photo (Optional)</label>
                                          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                                          {formData.personal_info?.profile_photo && <small>✅ Profile Photo Selected</small>}
                                    </div>

                                    <div className="form-group">
                                          <label>Headline / Professional Title *</label>
                                          <input
                                                type="text"
                                                value={formData.personal_info?.headline || ''}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, headline: e.target.value }
                                                })}
                                                placeholder="e.g. Senior Full-Stack Software Engineer | React & Python"
                                          />
                                    </div>

                                    <div className="form-row">
                                          <div className="form-group">
                                                <label>Full Name *</label>
                                                <input
                                                      type="text"
                                                      value={formData.personal_info?.name || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, name: e.target.value }
                                                      })}
                                                      placeholder="e.g. Alex Morgan"
                                                      required
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>Email *</label>
                                                <input
                                                      type="email"
                                                      value={formData.personal_info?.email || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, email: e.target.value }
                                                      })}
                                                      placeholder="e.g. alex@example.com"
                                                      required
                                                />
                                          </div>
                                    </div>

                                    <div className="form-row">
                                          <div className="form-group">
                                                <label>Phone *</label>
                                                <input
                                                      type="tel"
                                                      value={formData.personal_info?.phone || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, phone: e.target.value }
                                                      })}
                                                      placeholder="e.g. +1 (555) 234-5678"
                                                      required
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>Portfolio URL</label>
                                                <input
                                                      type="url"
                                                      value={formData.personal_info?.portfolio || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, portfolio: e.target.value }
                                                      })}
                                                      placeholder="https://yourportfolio.com"
                                                />
                                          </div>
                                    </div>

                                    <div className="form-row">
                                          <div className="form-group">
                                                <label>GitHub</label>
                                                <input
                                                      type="url"
                                                      value={formData.personal_info?.github || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, github: e.target.value }
                                                      })}
                                                      placeholder="https://github.com/username"
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>LinkedIn</label>
                                                <input
                                                      type="url"
                                                      value={formData.personal_info?.linkedin || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, linkedin: e.target.value }
                                                      })}
                                                      placeholder="https://linkedin.com/in/username"
                                                />
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Step 2: Summary */}
                        {currentStep === 2 && (
                              <div className="form-step fade-in">
                                    <h2>📝 Step 2: Professional Summary</h2>
                                    <p className="step-description">Write a compelling summary highlighting your key achievements (50-150 words)</p>
                                    <div className="form-group">
                                          <textarea
                                                value={formData.summary || ''}
                                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                rows={6}
                                                placeholder="Passionate Software Engineer with 5+ years of experience architecting distributed cloud applications..."
                                          />
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                <small>{formData.summary ? formData.summary.split(/\s+/).filter(Boolean).length : 0} words</small>
                                                <small style={{ color: 'var(--text-muted)' }}>Recommended: 40 - 120 words</small>
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Step 3: Education */}
                        {currentStep === 3 && (
                              <div className="form-step fade-in">
                                    <h2>🎓 Step 3: Education</h2>
                                    <p className="step-description">Add your degree, university, graduation year, and GPA</p>
                                    {formData.education.map((edu, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Education #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('education', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.education.length - 1}
                                                                  onClick={() => moveItem('education', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeEducation(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-group">
                                                      <label>Degree</label>
                                                      <input
                                                            type="text"
                                                            value={edu.degree}
                                                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                                            placeholder="B.Tech in Computer Science"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>College / University</label>
                                                      <input
                                                            type="text"
                                                            value={edu.college}
                                                            onChange={(e) => updateEducation(index, 'college', e.target.value)}
                                                            placeholder="XYZ Institute of Technology"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Year / Duration</label>
                                                            <input
                                                                  type="text"
                                                                  value={edu.year}
                                                                  onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                                                  placeholder="2020 - 2024"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Grade / CGPA</label>
                                                            <input
                                                                  type="text"
                                                                  value={edu.grade}
                                                                  onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                                                                  placeholder="3.8 GPA or 8.8 CGPA"
                                                            />
                                                      </div>
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addEducation} type="button" className="btn btn-secondary">+ Add Education</button>
                              </div>
                        )}

                        {/* Step 4: Skills */}
                        {currentStep === 4 && (
                              <div className="form-step fade-in">
                                    <h2>💼 Step 4: Skills &amp; Tech Stack</h2>
                                    <p className="step-description">Type and press Enter, or click popular skills below to add them</p>

                                    {/* Inline Add Skill Input */}
                                    <div className="inline-skill-adder">
                                          <input
                                                type="text"
                                                value={skillInput}
                                                onChange={(e) => setSkillInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddSkill();
                                                      }
                                                }}
                                                placeholder="Type skill (e.g. Next.js, Docker, Kubernetes) and press Enter..."
                                                className="skill-input-field"
                                          />
                                          <button
                                                type="button"
                                                onClick={() => handleAddSkill()}
                                                className="btn btn-primary btn-sm"
                                          >
                                                + Add Skill
                                          </button>
                                    </div>

                                    {/* Active Skills List */}
                                    <div className="active-skills-container">
                                          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                Your Skills ({formData.skills.length}):
                                          </label>
                                          <div className="skills-list" style={{ marginTop: '8px' }}>
                                                {formData.skills.map((skill, index) => (
                                                      <div key={index} className="skill-tag">
                                                            <span>{skill}</span>
                                                            <button type="button" onClick={() => removeSkill(index)} title="Remove">×</button>
                                                      </div>
                                                ))}
                                                {formData.skills.length === 0 && (
                                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            No skills added yet. Add some above or click quick suggestions below!
                                                      </span>
                                                )}
                                          </div>
                                    </div>

                                    {/* Quick Suggestions */}
                                    <div className="skill-suggestions-box">
                                          <span className="suggestions-label">💡 Popular Tech Skills (Click to add):</span>
                                          <div className="popular-skills-pills">
                                                {POPULAR_SKILLS.map((sk) => {
                                                      const isAdded = formData.skills.includes(sk);
                                                      return (
                                                            <button
                                                                  key={sk}
                                                                  type="button"
                                                                  disabled={isAdded}
                                                                  onClick={() => handleAddSkill(sk)}
                                                                  className={`pill-suggestion ${isAdded ? 'pill-added' : ''}`}
                                                            >
                                                                  {isAdded ? `✓ ${sk}` : `+ ${sk}`}
                                                            </button>
                                                      );
                                                })}
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Step 5: Projects */}
                        {currentStep === 5 && (
                              <div className="form-step fade-in">
                                    <h2>🚀 Step 5: Projects</h2>
                                    <p className="step-description">Showcase high-impact projects with metrics and tech stack</p>
                                    {formData.projects.map((proj, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Project #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('projects', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.projects.length - 1}
                                                                  onClick={() => moveItem('projects', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeProject(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-group">
                                                      <label>Project Title</label>
                                                      <input
                                                            type="text"
                                                            value={proj.title}
                                                            onChange={(e) => updateProject(index, 'title', e.target.value)}
                                                            placeholder="AI Resume Platform"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Technologies Used</label>
                                                      <input
                                                            type="text"
                                                            value={proj.technologies}
                                                            onChange={(e) => updateProject(index, 'technologies', e.target.value)}
                                                            placeholder="React, FastAPI, MongoDB, Docker"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description (Impact &amp; Metrics)</label>
                                                      <textarea
                                                            value={proj.description}
                                                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Engineered scalable full-stack application serving 1,000+ users with sub-50ms API responses..."
                                                      />
                                                      <button
                                                            type="button"
                                                            onClick={() => handleAIEnhanceBullet('project', index, proj.description)}
                                                            className="ai-generator-btn"
                                                            disabled={aiLoading}
                                                      >
                                                            ✨ {aiLoading && aiTarget?.type === 'project' && aiTarget?.index === index ? 'Enhancing...' : 'Enhance with AI'}
                                                      </button>

                                                      {aiTarget?.type === 'project' && aiTarget?.index === index && (
                                                            <div className="ai-variations-drawer fade-in">
                                                                  <h5>✨ Select an AI-Optimized Bullet Point:</h5>
                                                                  {aiLoading ? (
                                                                        <div className="spinner-small" style={{ margin: '8px 0' }} />
                                                                  ) : (
                                                                        aiVariations.map((varText, vIdx) => (
                                                                              <div
                                                                                    key={vIdx}
                                                                                    className="ai-variation-item"
                                                                                    onClick={() => applyAIVariation(varText)}
                                                                              >
                                                                                    • {varText}
                                                                              </div>
                                                                        ))
                                                                  )}
                                                            </div>
                                                      )}
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Repository URL (GitHub)</label>
                                                            <input
                                                                  type="url"
                                                                  value={proj.repository_url || ''}
                                                                  onChange={(e) => updateProject(index, 'repository_url', e.target.value)}
                                                                  placeholder="https://github.com/username/project"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Live Demo URL</label>
                                                            <input
                                                                  type="url"
                                                                  value={proj.live_demo_url || ''}
                                                                  onChange={(e) => updateProject(index, 'live_demo_url', e.target.value)}
                                                                  placeholder="https://demo-app.com"
                                                            />
                                                      </div>
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addProject} type="button" className="btn btn-secondary">+ Add Project</button>
                              </div>
                        )}

                        {/* Step 6: Experience */}
                        {currentStep === 6 && (
                              <div className="form-step fade-in">
                                    <h2>💻 Step 6: Work Experience</h2>
                                    <p className="step-description">Detail your professional experience and quantifiable achievements</p>
                                    {formData.experience.map((exp, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Experience #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('experience', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.experience.length - 1}
                                                                  onClick={() => moveItem('experience', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeExperience(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-group">
                                                      <label>Company / Organization</label>
                                                      <input
                                                            type="text"
                                                            value={exp.company}
                                                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                            placeholder="Apex Tech Systems"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Job Title / Role</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.role}
                                                                  onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                                  placeholder="Senior Software Engineer"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Duration</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.duration}
                                                                  onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                                                                  placeholder="2022 - Present"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Key Responsibilities &amp; Impact</label>
                                                      <textarea
                                                            value={exp.description}
                                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Architected distributed microservices reducing latency by 45%..."
                                                      />
                                                      <button
                                                            type="button"
                                                            onClick={() => handleAIEnhanceBullet('experience', index, exp.description)}
                                                            className="ai-generator-btn"
                                                            disabled={aiLoading}
                                                      >
                                                            ✨ {aiLoading && aiTarget?.type === 'experience' && aiTarget?.index === index ? 'Enhancing...' : 'Enhance with AI'}
                                                      </button>

                                                      {aiTarget?.type === 'experience' && aiTarget?.index === index && (
                                                            <div className="ai-variations-drawer fade-in">
                                                                  <h5>✨ Select an AI-Optimized Bullet Point:</h5>
                                                                  {aiLoading ? (
                                                                        <div className="spinner-small" style={{ margin: '8px 0' }} />
                                                                  ) : (
                                                                        aiVariations.map((varText, vIdx) => (
                                                                              <div
                                                                                    key={vIdx}
                                                                                    className="ai-variation-item"
                                                                                    onClick={() => applyAIVariation(varText)}
                                                                              >
                                                                                    • {varText}
                                                                              </div>
                                                                        ))
                                                                  )}
                                                            </div>
                                                      )}
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addExperience} type="button" className="btn btn-secondary">+ Add Experience</button>
                              </div>
                        )}

                        {/* Step 7: Certifications */}
                        {currentStep === 7 && (
                              <div className="form-step fade-in">
                                    <h2>📜 Step 7: Certifications (Optional)</h2>
                                    <p className="step-description">Add industry credentials, cloud certs, or specializations</p>
                                    {formData.certifications.map((cert, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Certification #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('certifications', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.certifications.length - 1}
                                                                  onClick={() => moveItem('certifications', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeCertification(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-group">
                                                      <label>Certification Name</label>
                                                      <input
                                                            type="text"
                                                            value={cert.name}
                                                            onChange={(e) => updateCertification(index, 'name', e.target.value)}
                                                            placeholder="AWS Certified Solutions Architect"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Issued By</label>
                                                            <input
                                                                  type="text"
                                                                  value={cert.issued_by}
                                                                  onChange={(e) => updateCertification(index, 'issued_by', e.target.value)}
                                                                  placeholder="Amazon Web Services"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Date / Year</label>
                                                            <input
                                                                  type="text"
                                                                  value={cert.date}
                                                                  onChange={(e) => updateCertification(index, 'date', e.target.value)}
                                                                  placeholder="2023"
                                                            />
                                                      </div>
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addCertification} type="button" className="btn btn-secondary">+ Add Certification</button>
                              </div>
                        )}

                        {/* Step 8: Achievements */}
                        {currentStep === 8 && (
                              <div className="form-step fade-in">
                                    <h2>🏆 Step 8: Achievements &amp; Awards (Optional)</h2>
                                    <p className="step-description">Highlight hackathons, honors, scholarships, and competitive milestones</p>
                                    {formData.achievements.map((ach, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Achievement #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('achievements', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.achievements.length - 1}
                                                                  onClick={() => moveItem('achievements', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeAchievement(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-group">
                                                      <label>Award / Achievement Title</label>
                                                      <input
                                                            type="text"
                                                            value={ach.title}
                                                            onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                                                            placeholder="1st Place - Silicon Valley Hackathon"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                            value={ach.description}
                                                            onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                                                            rows={2}
                                                            placeholder="Built AI solution competing against 150+ teams..."
                                                      />
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addAchievement} type="button" className="btn btn-secondary">+ Add Achievement</button>
                              </div>
                        )}

                        {/* Step 9: Coding Profiles */}
                        {currentStep === 9 && (
                              <div className="form-step fade-in">
                                    <h2>👨‍💻 Step 9: Problem Solving &amp; Coding Profiles</h2>
                                    <p className="step-description">Add LeetCode, Codeforces, HackerRank, or GitHub profile stats</p>
                                    {(formData.coding_profiles || []).map((prof, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="repeatable-item-header">
                                                      <span className="item-badge">Profile #{index + 1}</span>
                                                      <div className="item-reorder-actions">
                                                            <button
                                                                  type="button"
                                                                  disabled={index === 0}
                                                                  onClick={() => moveItem('coding_profiles', index, -1)}
                                                                  className="btn-icon"
                                                                  title="Move Up"
                                                            >
                                                                  ⬆️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  disabled={index === formData.coding_profiles.length - 1}
                                                                  onClick={() => moveItem('coding_profiles', index, 1)}
                                                                  className="btn-icon"
                                                                  title="Move Down"
                                                            >
                                                                  ⬇️
                                                            </button>
                                                            <button
                                                                  type="button"
                                                                  onClick={() => removeCodingProfile(index)}
                                                                  className="btn-icon btn-icon-danger"
                                                                  title="Delete"
                                                            >
                                                                  🗑️
                                                            </button>
                                                      </div>
                                                </div>

                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Platform Name</label>
                                                            <input
                                                                  type="text"
                                                                  value={prof.platform}
                                                                  onChange={(e) => updateCodingProfile(index, 'platform', e.target.value)}
                                                                  placeholder="LeetCode / Codeforces / GitHub"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Profile Link</label>
                                                            <input
                                                                  type="url"
                                                                  value={prof.link}
                                                                  onChange={(e) => updateCodingProfile(index, 'link', e.target.value)}
                                                                  placeholder="https://leetcode.com/username"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Headline / Stats</label>
                                                      <input
                                                            type="text"
                                                            value={prof.headline || ''}
                                                            onChange={(e) => updateCodingProfile(index, 'headline', e.target.value)}
                                                            placeholder="Knight Rank (2150 Rating) | 650+ Problems Solved"
                                                      />
                                                </div>
                                          </div>
                                    ))}
                                    <button onClick={addCodingProfile} type="button" className="btn btn-secondary">+ Add Platform Profile</button>
                              </div>
                        )}

                        {/* Step 10: Final Review */}
                        {currentStep === 10 && (
                              <div className="form-step fade-in">
                                    <h2>👀 Step 10: Final Review &amp; Save</h2>
                                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
                                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀</div>
                                          <h3>Your Resume Is Ready!</h3>
                                          <p style={{ color: 'var(--text-muted)', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
                                                Estimated ATS Score: <strong style={{ color: liveATSScore >= 70 ? '#10b981' : '#f59e0b' }}>{liveATSScore}%</strong>.
                                                Save your resume to compute the official ATS breakdown and download high-resolution PDF.
                                          </p>

                                          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                                <button onClick={() => setShowPreview(true)} type="button" className="btn btn-primary">
                                                      👁️ Live Preview Resume
                                                </button>
                                                <button onClick={() => setShowATSModal(true)} type="button" className="btn btn-secondary">
                                                      🎯 Run ATS Job Match
                                                </button>
                                                <button onClick={handleSave} disabled={loading} type="button" className="btn btn-success">
                                                      {loading ? 'Saving...' : '💾 Save Resume Now'}
                                                </button>
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="form-navigation">
                              {currentStep > 1 && (
                                    <button onClick={prevStep} type="button" className="btn btn-secondary">
                                          ← Previous
                                    </button>
                              )}
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                                    {currentStep < 10 && (
                                          <button onClick={nextStep} type="button" className="btn btn-primary">
                                                Next →
                                          </button>
                                    )}
                                    <button onClick={handleSave} disabled={loading} type="button" className="btn btn-success">
                                          {loading ? 'Saving...' : '💾 Save Resume'}
                                    </button>
                              </div>
                        </div>
                  </div>

                  {/* Mobile Sticky Action Bar */}
                  <div className="mobile-sticky-action-bar">
                        <button
                              onClick={prevStep}
                              disabled={currentStep === 1}
                              type="button"
                              className="btn btn-secondary btn-sm"
                        >
                              ◀ Prev
                        </button>
                        <span className="mobile-step-indicator">
                              Step {currentStep}/10
                        </span>
                        <button
                              onClick={nextStep}
                              disabled={currentStep === 10}
                              type="button"
                              className="btn btn-primary btn-sm"
                        >
                              Next ▶
                        </button>
                        <button
                              onClick={handleSave}
                              disabled={loading}
                              type="button"
                              className="btn btn-success btn-sm"
                        >
                              {loading ? '...' : '💾 Save'}
                        </button>
                  </div>

                  {/* Modals */}
                  {showPreview && (
                        <ResumePreview
                              formData={formData}
                              onClose={() => setShowPreview(false)}
                        />
                  )}

                  {showATSModal && (
                        <ATSAnalyzerModal
                              resume={formData}
                              onClose={() => setShowATSModal(false)}
                        />
                  )}
            </div>
      );
}

export default ResumeBuilder;

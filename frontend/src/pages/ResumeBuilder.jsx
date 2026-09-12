import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import axios from 'axios';
import config from '../config';
import '../styles/ResumeBuilder.css';
import '../styles/ResumeBuilderExtra.css';
import ResumePreview from '../components/ResumePreview';

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

      // AI Bullet Generator state
      const [aiTarget, setAiTarget] = useState(null); // { type: 'project'|'experience', index }
      const [aiLoading, setAiLoading] = useState(false);
      const [aiVariations, setAiVariations] = useState([]);

      const [formData, setFormData] = useState(() => {
            const savedData = localStorage.getItem('resume_draft');
            if (savedData && !id) {
                  return JSON.parse(savedData);
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
            if (!formData.personal_info.name || !formData.personal_info.email) {
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

      const nextStep = () => { if (currentStep < 10) setCurrentStep(currentStep + 1); };
      const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

      // AI Bullet Generator Trigger
      const handleAIEnhanceBullet = async (type, index, text) => {
            if (!text.trim()) {
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

      const addEducation = () => {
            setFormData({
                  ...formData,
                  education: [...formData.education, { degree: '', college: '', year: '', grade: '' }]
            });
      };
      const updateEducation = (index, field, value) => {
            const newEducation = [...formData.education];
            newEducation[index][field] = value;
            setFormData({ ...formData, education: newEducation });
      };
      const removeEducation = (index) => {
            setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
      };

      const addSkill = () => {
            const skill = prompt('Enter new skill:');
            if (skill && skill.trim()) {
                  setFormData({ ...formData, skills: [...formData.skills, skill.trim()] });
            }
      };
      const removeSkill = (index) => {
            setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
      };

      const addProject = () => {
            setFormData({
                  ...formData,
                  projects: [...formData.projects, { title: '', technologies: '', description: '', repository_url: '', live_demo_url: '' }]
            });
      };
      const updateProject = (index, field, value) => {
            const newProjects = [...formData.projects];
            newProjects[index][field] = value;
            setFormData({ ...formData, projects: newProjects });
      };
      const removeProject = (index) => {
            setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== index) });
      };

      const addExperience = () => {
            setFormData({
                  ...formData,
                  experience: [...formData.experience, { company: '', role: '', duration: '', description: '' }]
            });
      };
      const updateExperience = (index, field, value) => {
            const newExperience = [...formData.experience];
            newExperience[index][field] = value;
            setFormData({ ...formData, experience: newExperience });
      };
      const removeExperience = (index) => {
            setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) });
      };

      const addCertification = () => {
            setFormData({
                  ...formData,
                  certifications: [...formData.certifications, { name: '', file_data: '', file_url: '', issued_by: '', date: '' }]
            });
      };
      const updateCertification = (index, field, value) => {
            const newCerts = [...formData.certifications];
            newCerts[index][field] = value;
            setFormData({ ...formData, certifications: newCerts });
      };
      const removeCertification = (index) => {
            setFormData({ ...formData, certifications: formData.certifications.filter((_, i) => i !== index) });
      };

      const addAchievement = () => {
            setFormData({
                  ...formData,
                  achievements: [...formData.achievements, { title: '', description: '', date: '', link: '' }]
            });
      };
      const updateAchievement = (index, field, value) => {
            const newAchievements = [...formData.achievements];
            newAchievements[index][field] = value;
            setFormData({ ...formData, achievements: newAchievements });
      };
      const removeAchievement = (index) => {
            setFormData({ ...formData, achievements: formData.achievements.filter((_, i) => i !== index) });
      };

      const addCodingProfile = () => {
            setFormData({
                  ...formData,
                  coding_profiles: [...(formData.coding_profiles || []), { platform: '', link: '', headline: '' }]
            });
      };
      const updateCodingProfile = (index, field, value) => {
            const newProfiles = [...formData.coding_profiles];
            newProfiles[index][field] = value;
            setFormData({ ...formData, coding_profiles: newProfiles });
      };
      const removeCodingProfile = (index) => {
            const newProfiles = [...formData.coding_profiles];
            newProfiles.splice(index, 1);
            setFormData({ ...formData, coding_profiles: newProfiles });
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
                  <div className="builder-header">
                        <div>
                              <h1>{id ? '✏️ Edit Resume' : '✨ Create Resume'}</h1>
                        </div>
                        <div className="header-actions">
                              <button onClick={() => setShowATSModal(true)} className="btn btn-secondary">
                                    🎯 ATS Job Matcher
                              </button>
                              <button onClick={() => setShowPreview(true)} className="btn btn-primary">
                                    👁️ Live Preview
                              </button>
                              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
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

                  {/* Score Indicator */}
                  {score !== null && (
                        <div className="score-display">
                              <h3>ATS Optimization Score: <span className={score < 50 ? 'red' : score < 65 ? 'orange' : 'green'}>{score}%</span></h3>
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
                                    {step.num}
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
                                          {formData.personal_info.profile_photo && <small>✅ Profile Photo Selected</small>}
                                    </div>

                                    <div className="form-group">
                                          <label>Headline / Professional Title *</label>
                                          <input
                                                type="text"
                                                value={formData.personal_info.headline || ''}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, headline: e.target.value }
                                                })}
                                                placeholder="e.g. Full-Stack Engineer | React & Python"
                                          />
                                    </div>

                                    <div className="form-row">
                                          <div className="form-group">
                                                <label>Full Name *</label>
                                                <input
                                                      type="text"
                                                      value={formData.personal_info.name}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, name: e.target.value }
                                                      })}
                                                      required
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>Email *</label>
                                                <input
                                                      type="email"
                                                      value={formData.personal_info.email}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, email: e.target.value }
                                                      })}
                                                      required
                                                />
                                          </div>
                                    </div>

                                    <div className="form-row">
                                          <div className="form-group">
                                                <label>Phone *</label>
                                                <input
                                                      type="tel"
                                                      value={formData.personal_info.phone}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, phone: e.target.value }
                                                      })}
                                                      required
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>Portfolio URL</label>
                                                <input
                                                      type="url"
                                                      value={formData.personal_info.portfolio || ''}
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
                                                      value={formData.personal_info.github || ''}
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
                                                      value={formData.personal_info.linkedin || ''}
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
                                                value={formData.summary}
                                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                rows={6}
                                                placeholder="Passionate Software Engineer with expertise in..."
                                          />
                                          <small>{formData.summary.split(/\s+/).filter(Boolean).length} words</small>
                                    </div>
                              </div>
                        )}

                        {/* Step 3: Education */}
                        {currentStep === 3 && (
                              <div className="form-step fade-in">
                                    <h2>🎓 Step 3: Education</h2>
                                    <p className="step-description">Add your educational background</p>
                                    {formData.education.map((edu, index) => (
                                          <div key={index} className="repeatable-item">
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
                                                      <label>College/University</label>
                                                      <input
                                                            type="text"
                                                            value={edu.college}
                                                            onChange={(e) => updateEducation(index, 'college', e.target.value)}
                                                            placeholder="XYZ Institute of Technology"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Year</label>
                                                            <input
                                                                  type="text"
                                                                  value={edu.year}
                                                                  onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                                                  placeholder="2020-2024"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Grade / CGPA</label>
                                                            <input
                                                                  type="text"
                                                                  value={edu.grade}
                                                                  onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                                                                  placeholder="8.8 CGPA"
                                                            />
                                                      </div>
                                                </div>
                                                <button onClick={() => removeEducation(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addEducation} className="btn btn-secondary">+ Add Education</button>
                              </div>
                        )}

                        {/* Step 4: Skills */}
                        {currentStep === 4 && (
                              <div className="form-step fade-in">
                                    <h2>💼 Step 4: Skills</h2>
                                    <p className="step-description">List your key technical and soft skills</p>
                                    <div className="skills-list">
                                          {formData.skills.map((skill, index) => (
                                                <div key={index} className="skill-tag">
                                                      {skill}
                                                      <button onClick={() => removeSkill(index)}>×</button>
                                                </div>
                                          ))}
                                    </div>
                                    <button onClick={addSkill} className="btn btn-secondary">+ Add Skill</button>
                              </div>
                        )}

                        {/* Step 5: Projects */}
                        {currentStep === 5 && (
                              <div className="form-step fade-in">
                                    <h2>🚀 Step 5: Projects</h2>
                                    <p className="step-description">Showcase projects with action verbs and quantifiable metrics</p>
                                    {formData.projects.map((proj, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-group">
                                                      <label>Project Title</label>
                                                      <input
                                                            type="text"
                                                            value={proj.title}
                                                            onChange={(e) => updateProject(index, 'title', e.target.value)}
                                                            placeholder="AI Resume Builder"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Technologies Used</label>
                                                      <input
                                                            type="text"
                                                            value={proj.technologies}
                                                            onChange={(e) => updateProject(index, 'technologies', e.target.value)}
                                                            placeholder="React, FastAPI, MongoDB"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                            value={proj.description}
                                                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Developed scalable web app serving 1,000+ users..."
                                                      />
                                                      <button
                                                            type="button"
                                                            className="ai-generator-btn"
                                                            onClick={() => handleAIEnhanceBullet('project', index, proj.description)}
                                                      >
                                                            ⚡ AI Enhance Description
                                                      </button>

                                                      {aiTarget?.type === 'project' && aiTarget?.index === index && (
                                                            <div className="ai-variations-drawer">
                                                                  <h5>✨ Select an AI-Enhanced Variation:</h5>
                                                                  {aiLoading ? (
                                                                        <p>Generating high-impact variations...</p>
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
                                                <button onClick={() => removeProject(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addProject} className="btn btn-secondary">+ Add Project</button>
                              </div>
                        )}

                        {/* Step 6: Experience */}
                        {currentStep === 6 && (
                              <div className="form-step fade-in">
                                    <h2>💻 Step 6: Professional Experience (Optional)</h2>
                                    <p className="step-description">Detail your work experience or internships</p>
                                    {formData.experience.map((exp, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Company</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.company}
                                                                  onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                                  placeholder="Acme Corp"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Role</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.role}
                                                                  onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                                  placeholder="Software Engineer Intern"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Duration</label>
                                                      <input
                                                            type="text"
                                                            value={exp.duration}
                                                            onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                                                            placeholder="Jan 2024 - Present"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                            value={exp.description}
                                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Reduced database query times by 40%..."
                                                      />
                                                      <button
                                                            type="button"
                                                            className="ai-generator-btn"
                                                            onClick={() => handleAIEnhanceBullet('experience', index, exp.description)}
                                                      >
                                                            ⚡ AI Enhance Description
                                                      </button>

                                                      {aiTarget?.type === 'experience' && aiTarget?.index === index && (
                                                            <div className="ai-variations-drawer">
                                                                  <h5>✨ Select an AI-Enhanced Variation:</h5>
                                                                  {aiLoading ? (
                                                                        <p>Generating high-impact variations...</p>
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
                                                <button onClick={() => removeExperience(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addExperience} className="btn btn-secondary">+ Add Experience</button>
                              </div>
                        )}

                        {/* Step 7: Certifications */}
                        {currentStep === 7 && (
                              <div className="form-step fade-in">
                                    <h2>📜 Step 7: Certifications (Optional)</h2>
                                    {formData.certifications.map((cert, index) => (
                                          <div key={index} className="repeatable-item">
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
                                                            <label>Date</label>
                                                            <input
                                                                  type="text"
                                                                  value={cert.date}
                                                                  onChange={(e) => updateCertification(index, 'date', e.target.value)}
                                                                  placeholder="Jan 2024"
                                                            />
                                                      </div>
                                                </div>
                                                <button onClick={() => removeCertification(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addCertification} className="btn btn-secondary">+ Add Certification</button>
                              </div>
                        )}

                        {/* Step 8: Achievements */}
                        {currentStep === 8 && (
                              <div className="form-step fade-in">
                                    <h2>🏆 Step 8: Achievements &amp; Awards (Optional)</h2>
                                    {formData.achievements.map((ach, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-group">
                                                      <label>Title</label>
                                                      <input
                                                            type="text"
                                                            value={ach.title}
                                                            onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                                                            placeholder="1st Place - National Hackathon"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                            value={ach.description}
                                                            onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                                                            rows={2}
                                                            placeholder="Built AI application competing against 200+ teams"
                                                      />
                                                </div>
                                                <button onClick={() => removeAchievement(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addAchievement} className="btn btn-secondary">+ Add Achievement</button>
                              </div>
                        )}

                        {/* Step 9: Coding Profiles */}
                        {currentStep === 9 && (
                              <div className="form-step fade-in">
                                    <h2>👨‍💻 Step 9: Problem Solving &amp; Coding Profiles</h2>
                                    {(formData.coding_profiles || []).map((prof, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Platform Name</label>
                                                            <input
                                                                  type="text"
                                                                  value={prof.platform}
                                                                  onChange={(e) => updateCodingProfile(index, 'platform', e.target.value)}
                                                                  placeholder="GeeksforGeeks / LeetCode"
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
                                                            placeholder="Max Rating 1850 | 500+ Solved"
                                                      />
                                                </div>
                                                <button onClick={() => removeCodingProfile(index)} className="btn btn-sm btn-danger">Remove</button>
                                          </div>
                                    ))}
                                    <button onClick={addCodingProfile} className="btn btn-secondary">+ Add Platform Profile</button>
                              </div>
                        )}

                        {/* Step 10: Final Review */}
                        {currentStep === 10 && (
                              <div className="form-step fade-in">
                                    <h2>👀 Step 10: Final Review &amp; Save</h2>
                                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                                          <h3>🎉 You are ready to generate your ATS Resume!</h3>
                                          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Click "Save Resume" to update your ATS score and download your PDF.</p>
                                          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                                <button onClick={() => setShowPreview(true)} className="btn btn-primary">
                                                      👁️ Live Preview Resume
                                                </button>
                                          </div>
                                    </div>
                              </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="form-navigation">
                              {currentStep > 1 && (
                                    <button onClick={prevStep} className="btn btn-secondary">Previous</button>
                              )}
                              {currentStep < 10 ? (
                                    <button onClick={nextStep} className="btn btn-primary" style={{ marginLeft: 'auto' }}>Next</button>
                              ) : null}
                              <button onClick={handleSave} className="btn btn-success" disabled={loading}>
                                    {loading ? 'Saving...' : '💾 Save Resume'}
                              </button>
                        </div>
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

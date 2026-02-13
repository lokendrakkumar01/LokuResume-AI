import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import config from '../config';
import '../styles/ResumeBuilder.css';
import '../styles/ResumeBuilderExtra.css';
import ResumePreview from '../components/ResumePreview';

function ResumeBuilder() {
      const { id } = useParams();
      const { getAuthHeader } = useAuth();
      const navigate = useNavigate();
      const [currentStep, setCurrentStep] = useState(1);
      const [loading, setLoading] = useState(false);
      const [score, setScore] = useState(null);
      const [showPreview, setShowPreview] = useState(false);

      const [formData, setFormData] = useState({
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
            summary: '',
            education: [],
            skills: [],
            projects: [],
            experience: [],
            certifications: [],
            achievements: [],
            pdf_preferences: {
                  background_color: '#ffffff',
                  accent_color: '#1a73e8'
            }
      });

      useEffect(() => {
            if (id) {
                  fetchResume();
            }
      }, [id]);

      const fetchResume = async () => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });

                  // Handle backward compatibility for certifications
                  const data = response.data;
                  if (data.certifications && data.certifications.length > 0) {
                        data.certifications = data.certifications.map(cert => {
                              if (typeof cert === 'string') {
                                    return { name: cert, file_data: '', file_url: '', issued_by: '', date: '' };
                              }
                              // Ensure file_url exists for older data
                              if (!cert.hasOwnProperty('file_url')) {
                                    cert.file_url = '';
                              }
                              return cert;
                        });
                  }

                  // Handle backward compatibility for pdf_preferences
                  if (!data.pdf_preferences) {
                        data.pdf_preferences = {
                              background_color: '#ffffff',
                              accent_color: '#1a73e8'
                        };
                  }

                  setFormData(data);
                  setScore(data.score);
            } catch (error) {
                  console.error('Failed to fetch resume');
            }
      };

      const handleSave = async () => {
            setLoading(true);
            try {
                  if (id) {
                        const response = await axios.put(`${config.API_BASE_URL}/resumes/${id}`, formData, {
                              headers: getAuthHeader()
                        });
                        setScore(response.data.score);
                        alert('Resume updated successfully!');
                  } else {
                        const response = await axios.post(`${config.API_BASE_URL}/resumes`, formData, {
                              headers: getAuthHeader()
                        });
                        setScore(response.data.score);
                        alert('Resume created successfully!');
                        navigate(`/resume/edit/${response.data.id}`);
                  }
            } catch (error) {
                  console.error('Save error:', error);
                  const errorMessage = error.response?.data?.detail
                        ? JSON.stringify(error.response.data.detail)
                        : 'Failed to save resume. Please check your connection or try again.';
                  alert(errorMessage);
            }
            setLoading(false);
      };

      const nextStep = () => {
            if (currentStep < 8) setCurrentStep(currentStep + 1);
      };

      const prevStep = () => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
      };

      const handlePhotoUpload = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                  if (file.size > 2 * 1024 * 1024) {
                        alert('Photo size should be less than 2MB');
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
                  alert('Please select a valid image file');
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
            setFormData({
                  ...formData,
                  education: formData.education.filter((_, i) => i !== index)
            });
      };

      const addSkill = () => {
            const skill = prompt('Enter skill:');
            if (skill) {
                  setFormData({
                        ...formData,
                        skills: [...formData.skills, skill]
                  });
            }
      };

      const removeSkill = (index) => {
            setFormData({
                  ...formData,
                  skills: formData.skills.filter((_, i) => i !== index)
            });
      };

      const addProject = () => {
            setFormData({
                  ...formData,
                  projects: [...formData.projects, {
                        title: '',
                        technologies: '',
                        description: '',
                        repository_url: '',
                        live_demo_url: ''
                  }]
            });
      };

      const updateProject = (index, field, value) => {
            const newProjects = [...formData.projects];
            newProjects[index][field] = value;
            setFormData({ ...formData, projects: newProjects });
      };

      const removeProject = (index) => {
            setFormData({
                  ...formData,
                  projects: formData.projects.filter((_, i) => i !== index)
            });
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
            setFormData({
                  ...formData,
                  experience: formData.experience.filter((_, i) => i !== index)
            });
      };

      const addCertification = () => {
            setFormData({
                  ...formData,
                  certifications: [...formData.certifications, {
                        name: '',
                        file_data: '',
                        file_url: '',
                        issued_by: '',
                        date: ''
                  }]
            });
      };

      const updateCertification = (index, field, value) => {
            const newCerts = [...formData.certifications];
            newCerts[index][field] = value;
            setFormData({ ...formData, certifications: newCerts });
      };

      const removeCertification = (index) => {
            setFormData({
                  ...formData,
                  certifications: formData.certifications.filter((_, i) => i !== index)
            });
      };

      const handleCertificateUpload = (index, e) => {
            const file = e.target.files[0];
            if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                        alert('File size should be less than 2MB');
                        return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                        const newCerts = [...formData.certifications];
                        newCerts[index].file_data = reader.result;
                        setFormData({ ...formData, certifications: newCerts });
                  };
                  reader.readAsDataURL(file);
            }
      };

      const addAchievement = () => {
            setFormData({
                  ...formData,
                  achievements: [...formData.achievements, {
                        title: '',
                        description: '',
                        date: '',
                        link: ''
                  }]
            });
      };

      const updateAchievement = (index, field, value) => {
            const newAchievements = [...formData.achievements];
            newAchievements[index][field] = value;
            setFormData({ ...formData, achievements: newAchievements });
      };

      const removeAchievement = (index) => {
            setFormData({
                  ...formData,
                  achievements: formData.achievements.filter((_, i) => i !== index)
            });
      };

      return (
            <div className="resume-builder">
                  <div className="builder-header">
                        <div className="header-left">
                              <h1>{id ? 'Edit Resume' : 'Create Resume'}</h1>
                        </div>
                        <div className="header-actions">
                              <button onClick={() => setShowPreview(true)} className="btn btn-preview">
                                    👁️ Preview Resume
                              </button>
                              <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
                                    Back to Dashboard
                              </button>
                        </div>
                  </div>

                  {/* PDF Customization */}
                  <div className="pdf-customization">
                        <h4>🎨 PDF Customization</h4>
                        <div className="color-pickers">
                              <div className="color-picker-group">
                                    <label>Accent Color:</label>
                                    <input
                                          type="color"
                                          value={formData.pdf_preferences.accent_color}
                                          onChange={(e) => setFormData({
                                                ...formData,
                                                pdf_preferences: { ...formData.pdf_preferences, accent_color: e.target.value }
                                          })}
                                    />
                                    <span className="color-value">{formData.pdf_preferences.accent_color}</span>
                              </div>
                              <div className="color-picker-group">
                                    <label>Background Color:</label>
                                    <input
                                          type="color"
                                          value={formData.pdf_preferences.background_color}
                                          onChange={(e) => setFormData({
                                                ...formData,
                                                pdf_preferences: { ...formData.pdf_preferences, background_color: e.target.value }
                                          })}
                                    />
                                    <span className="color-value">{formData.pdf_preferences.background_color}</span>
                              </div>
                        </div>
                  </div>

                  {score !== null && (
                        <div className="score-display">
                              <h3>Current Score: <span className={score < 50 ? 'red' : score < 65 ? 'orange' : 'green'}>{score}%</span></h3>
                        </div>
                  )}

                  <div className="progress-bar">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                              <div key={step} className={`progress-step ${currentStep >= step ? 'active' : ''}`}>
                                    {step}
                              </div>
                        ))}
                  </div>

                  <div className="builder-form">
                        {/* Step 1: Personal Information */}
                        {currentStep === 1 && (
                              <div className="form-step fade-in">
                                    <h2>👤 Step 1: Personal Information</h2>
                                    <p className="step-description">Add your contact details and professional links</p>
                                    <div className="form-group">
                                          <label>Profile Photo (Optional)</label>
                                          <div className="photo-upload-container">
                                                {formData.personal_info.profile_photo && (
                                                      <img
                                                            src={formData.personal_info.profile_photo}
                                                            alt="Profile"
                                                            className="profile-photo-preview"
                                                      />
                                                )}
                                                <input
                                                      type="file"
                                                      accept="image/*"
                                                      onChange={handlePhotoUpload}
                                                      className="file-input"
                                                />
                                          </div>
                                    </div>
                                    <div className="form-group">
                                          <label>Headline / Professional Title</label>
                                          <input
                                                type="text"
                                                value={formData.personal_info.headline || ''}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, headline: e.target.value }
                                                })}
                                                placeholder="e.g. Full-Stack Developer | MERN & Java"
                                          />
                                    </div>
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
                                          <label>LinkedIn</label>
                                          <input
                                                type="url"
                                                value={formData.personal_info.linkedin}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, linkedin: e.target.value }
                                                })}
                                                placeholder="https://linkedin.com/in/yourprofile"
                                          />
                                    </div>
                                    <div className="form-group">
                                          <label>GitHub</label>
                                          <input
                                                type="url"
                                                value={formData.personal_info.github}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, github: e.target.value }
                                                })}
                                                placeholder="https://github.com/yourusername"
                                          />
                                    </div>
                                    <div className="form-group">
                                          <label>LeetCode</label>
                                          <input
                                                type="url"
                                                value={formData.personal_info.leetcode}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, leetcode: e.target.value }
                                                })}
                                                placeholder="https://leetcode.com/yourusername"
                                          />
                                    </div>
                                    <div className="form-group">
                                          <label>Portfolio Website</label>
                                          <input
                                                type="url"
                                                value={formData.personal_info.portfolio}
                                                onChange={(e) => setFormData({
                                                      ...formData,
                                                      personal_info: { ...formData.personal_info, portfolio: e.target.value }
                                                })}
                                                placeholder="https://yourportfolio.com"
                                          />
                                    </div>
                              </div>
                        )}

                        {/* Step 2: Professional Summary */}
                        {currentStep === 2 && (
                              <div className="form-step fade-in">
                                    <h2>📝 Step 2: Professional Summary</h2>
                                    <p className="step-description">Write a compelling summary highlighting your key achievements</p>
                                    <div className="form-group">
                                          <label>Summary (50-150 words recommended)</label>
                                          <textarea
                                                value={formData.summary}
                                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                rows={6}
                                                placeholder="Write a compelling summary highlighting your key achievements and skills..."
                                          />
                                          <small>{formData.summary.split(' ').filter(w => w).length} words</small>
                                    </div>
                              </div>
                        )}

                        {/* Step 3: Education */}
                        {currentStep === 3 && (
                              <div className="form-step fade-in">
                                    <h2>🎓 Step 3: Education</h2>
                                    <p className="step-description">Add your educational qualifications</p>
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
                                                            placeholder="ABC University"
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
                                                            <label>CGPA/Percentage</label>
                                                            <input
                                                                  type="text"
                                                                  value={edu.grade}
                                                                  onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                                                                  placeholder="8.5 CGPA"
                                                            />
                                                      </div>
                                                </div>
                                                <button onClick={() => removeEducation(index)} className="btn btn-sm btn-danger">
                                                      Remove
                                                </button>
                                          </div>
                                    ))}
                                    <button onClick={addEducation} className="btn btn-secondary">+ Add Education</button>
                              </div>
                        )}

                        {/* Step 4: Skills */}
                        {currentStep === 4 && (
                              <div className="form-step fade-in">
                                    <h2>💼 Step 4: Skills</h2>
                                    <p className="step-description">List your technical and soft skills</p>
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
                                    <p className="step-description">Showcase your technical projects with measurable results</p>
                                    {formData.projects.map((project, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-group">
                                                      <label>Project Title</label>
                                                      <input
                                                            type="text"
                                                            value={project.title}
                                                            onChange={(e) => updateProject(index, 'title', e.target.value)}
                                                            placeholder="E-commerce Platform"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Technologies Used</label>
                                                      <input
                                                            type="text"
                                                            value={project.technologies}
                                                            onChange={(e) => updateProject(index, 'technologies', e.target.value)}
                                                            placeholder="React, Node.js, MongoDB"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Repository URL</label>
                                                            <input
                                                                  type="url"
                                                                  value={project.repository_url}
                                                                  onChange={(e) => updateProject(index, 'repository_url', e.target.value)}
                                                                  placeholder="https://github.com/username/repo"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Live Demo URL</label>
                                                            <input
                                                                  type="url"
                                                                  value={project.live_demo_url}
                                                                  onChange={(e) => updateProject(index, 'live_demo_url', e.target.value)}
                                                                  placeholder="https://project-demo.com"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Description (Include measurable results)</label>
                                                      <textarea
                                                            value={project.description}
                                                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                                                            rows={4}
                                                            placeholder="Developed a full-stack platform that increased sales by 30%..."
                                                      />
                                                </div>
                                                <button onClick={() => removeProject(index)} className="btn btn-sm btn-danger">
                                                      Remove
                                                </button>
                                          </div>
                                    ))}
                                    <button onClick={addProject} className="btn btn-secondary">+ Add Project</button>
                              </div>
                        )}

                        {/* Step 6: Experience (Optional) */}
                        {currentStep === 6 && (
                              <div className="form-step fade-in">
                                    <h2>💻 Step 6: Experience (Optional)</h2>
                                    <p className="step-description">Add your professional work experience</p>
                                    {formData.experience.map((exp, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-group">
                                                      <label>Company</label>
                                                      <input
                                                            type="text"
                                                            value={exp.company}
                                                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                            placeholder="Tech Corp"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Role</label>
                                                      <input
                                                            type="text"
                                                            value={exp.role}
                                                            onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                            placeholder="Software Engineer"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Duration</label>
                                                      <input
                                                            type="text"
                                                            value={exp.duration}
                                                            onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                                                            placeholder="Jan 2023 - Present"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description (Use action verbs, quantify impact)</label>
                                                      <textarea
                                                            value={exp.description}
                                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                            rows={4}
                                                            placeholder="Led a team of 5 developers to deliver..."
                                                      />
                                                </div>
                                                <button onClick={() => removeExperience(index)} className="btn btn-sm btn-danger">
                                                      Remove
                                                </button>
                                          </div>
                                    ))}
                                    <button onClick={addExperience} className="btn btn-secondary">+ Add Experience</button>
                              </div>
                        )}

                        {/* Step 7: Certifications (Optional) */}
                        {currentStep === 7 && (
                              <div className="form-step fade-in">
                                    <h2>📜 Step 7: Certifications (Optional)</h2>
                                    <p className="step-description">Add your professional certifications and credentials</p>
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
                                                <div className="form-group">
                                                      <label>Upload Certificate (Image/PDF)</label>
                                                      <input
                                                            type="file"
                                                            accept="image/*,.pdf"
                                                            onChange={(e) => handleCertificateUpload(index, e)}
                                                            className="file-input"
                                                      />
                                                      {cert.file_data && <span className="file-success">✅ File uploaded</span>}
                                                </div>
                                                <div className="form-group">
                                                      <label>Certificate URL (Optional)</label>
                                                      <input
                                                            type="url"
                                                            value={cert.file_url || ''}
                                                            onChange={(e) => updateCertification(index, 'file_url', e.target.value)}
                                                            placeholder="https://example.com/certificate.pdf"
                                                      />
                                                      <small>Provide a link to your certificate (e.g., Coursera, Udemy, etc.)</small>
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
                                                <button onClick={() => removeCertification(index)} className="btn btn-sm btn-danger">
                                                      Remove
                                                </button>
                                          </div>
                                    ))}
                                    <button onClick={addCertification} className="btn btn-secondary">+ Add Certification</button>
                              </div>
                        )}

                        {/* Step 8: Achievements (Optional) */}
                        {currentStep === 8 && (
                              <div className="form-step fade-in">
                                    <h2>🏆 Step 8: Achievements & Awards (Optional)</h2>
                                    <p className="step-description">Add your achievements, awards, and honors</p>
                                    {formData.achievements.map((achievement, index) => (
                                          <div key={index} className="repeatable-item">
                                                <div className="form-group">
                                                      <label>Achievement/Award Title</label>
                                                      <input
                                                            type="text"
                                                            value={achievement.title}
                                                            onChange={(e) => updateAchievement(index, 'title', e.target.value)}
                                                            placeholder="Winner - National Hackathon 2024"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Description</label>
                                                      <textarea
                                                            value={achievement.description}
                                                            onChange={(e) => updateAchievement(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Developed an AI-powered solution that won first place among 200+ teams..."
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Date/Year</label>
                                                      <input
                                                            type="text"
                                                            value={achievement.date}
                                                            onChange={(e) => updateAchievement(index, 'date', e.target.value)}
                                                            placeholder="March 2024"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>Link/URL (Optional)</label>
                                                      <input
                                                            type="url"
                                                            value={achievement.link || ''}
                                                            onChange={(e) => updateAchievement(index, 'link', e.target.value)}
                                                            placeholder="https://example.com/achievement-proof"
                                                      />
                                                      <small>Provide a link to news article, certificate, or proof</small>
                                                </div>
                                                <button onClick={() => removeAchievement(index)} className="btn btn-sm btn-danger">
                                                      Remove
                                                </button>
                                          </div>
                                    ))}
                                    <button onClick={addAchievement} className="btn btn-secondary">+ Add Achievement</button>
                              </div>
                        )}

                        <div className="form-navigation">
                              {currentStep > 1 && (
                                    <button onClick={prevStep} className="btn btn-secondary">Previous</button>
                              )}
                              {currentStep < 8 && (
                                    <button onClick={nextStep} className="btn btn-primary">Next</button>
                              )}
                              <button onClick={handleSave} className="btn btn-success" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Resume'}
                              </button>
                        </div>
                  </div>

                  {/* Preview Modal */}
                  {showPreview && (
                        <ResumePreview
                              formData={formData}
                              onClose={() => setShowPreview(false)}
                        />
                  )}
            </div>
      );
}

export default ResumeBuilder;

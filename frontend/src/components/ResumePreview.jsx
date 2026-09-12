import React from 'react';
import '../styles/ResumePreview.css';

function ResumePreview({ formData, onClose }) {
      const {
            personal_info, summary, education, skills, projects,
            experience, certifications, achievements, coding_profiles,
            pdf_preferences, template_style = 'modern'
      } = formData;

      const accentColor = pdf_preferences?.accent_color || '#4f46e5';

      return (
            <div className="preview-modal-overlay" onClick={onClose}>
                  <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-header">
                              <div>
                                    <h2>📄 Live Resume Preview ({template_style.toUpperCase()})</h2>
                              </div>
                              <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Close</button>
                        </div>

                        <div className="preview-content">
                              <div
                                    className={`resume-page tpl-${template_style}`}
                                    style={{
                                          backgroundColor: pdf_preferences?.background_color || '#ffffff',
                                          '--accent-color': accentColor
                                    }}
                              >
                                    {/* Header */}
                                    <div className="resume-header">
                                          {personal_info.profile_photo && (
                                                <img
                                                      src={personal_info.profile_photo}
                                                      alt="Profile"
                                                      style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', float: 'right' }}
                                                />
                                          )}
                                          <div>
                                                <h1 className="name">{personal_info.name || 'Your Name'}</h1>
                                                <p className="title">{personal_info.headline || 'Full-Stack Developer'}</p>
                                                <div className="contact-links">
                                                      {personal_info.email && <span>✉️ {personal_info.email}</span>}
                                                      {personal_info.phone && <span>📞 {personal_info.phone}</span>}
                                                      {personal_info.github && <span>🔗 GitHub</span>}
                                                      {personal_info.linkedin && <span>🔗 LinkedIn</span>}
                                                      {personal_info.portfolio && <span>🌐 Portfolio</span>}
                                                </div>
                                          </div>
                                    </div>

                                    {/* Summary */}
                                    {summary && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Professional Summary</h3>
                                                <p>{summary}</p>
                                          </div>
                                    )}

                                    {/* Skills */}
                                    {skills && skills.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Skills &amp; Expertise</h3>
                                                <p><strong>Technical Skills:</strong> {skills.join(' • ')}</p>
                                          </div>
                                    )}

                                    {/* Projects */}
                                    {projects && projects.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Projects</h3>
                                                {projects.map((proj, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{proj.title} {proj.technologies && <em>({proj.technologies})</em>}</h4>
                                                            <p>{proj.description}</p>
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Experience */}
                                    {experience && experience.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Work Experience</h3>
                                                {experience.map((exp, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{exp.role} - {exp.company} <span style={{ float: 'right', fontWeight: 'normal', fontSize: '0.85rem' }}>{exp.duration}</span></h4>
                                                            <p>{exp.description}</p>
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Education */}
                                    {education && education.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Education</h3>
                                                {education.map((edu, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{edu.degree} - {edu.college} <span style={{ float: 'right', fontWeight: 'normal' }}>{edu.year}</span></h4>
                                                            {edu.grade && <p>Grade: {edu.grade}</p>}
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Coding Profiles */}
                                    {coding_profiles && coding_profiles.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Coding Profiles</h3>
                                                {coding_profiles.map((prof, index) => (
                                                      <div key={index} className="profile-item">
                                                            <strong>{prof.platform}:</strong> {prof.headline} — <a href={prof.link} target="_blank" rel="noreferrer">View Profile</a>
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Certifications */}
                                    {certifications && certifications.length > 0 && (
                                          <div className="resume-section">
                                                <h3 style={{ color: accentColor }}>Certifications</h3>
                                                <ul>
                                                      {certifications.map((cert, index) => (
                                                            <li key={index}>
                                                                  {typeof cert === 'string' ? cert : `${cert.name} ${cert.issued_by ? `- ${cert.issued_by}` : ''}`}
                                                            </li>
                                                      ))}
                                                </ul>
                                          </div>
                                    )}
                              </div>
                        </div>
                  </div>
            </div>
      );
}

export default ResumePreview;

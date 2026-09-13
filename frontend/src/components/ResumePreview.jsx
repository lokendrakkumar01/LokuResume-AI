import React, { useState, useEffect, useRef } from 'react';
import '../styles/ResumePreview.css';

function ResumePreview({ formData, onClose }) {
      const [template, setTemplate] = useState(formData.template_style || 'modern');
      const [accentColor, setAccentColor] = useState(formData.pdf_preferences?.accent_color || '#4f46e5');
      const [zoom, setZoom] = useState(1);
      const [fitScale, setFitScale] = useState(1);
      const containerRef = useRef(null);

      const {
            personal_info = {},
            summary = '',
            education = [],
            skills = [],
            projects = [],
            experience = [],
            certifications = [],
            achievements = [],
            coding_profiles = [],
            pdf_preferences = {}
      } = formData;

      const colorPresets = ['#4f46e5', '#059669', '#2563eb', '#7c3aed', '#dc2626', '#0f766e', '#1e293b'];

      useEffect(() => {
            const computeFitScale = () => {
                  if (containerRef.current) {
                        const availableWidth = containerRef.current.clientWidth - (window.innerWidth < 768 ? 16 : 40);
                        const calculated = Math.min(1.1, Math.max(0.35, availableWidth / 760));
                        setFitScale(calculated);
                        if (window.innerWidth < 768) {
                              setZoom(calculated);
                        }
                  }
            };

            computeFitScale();
            window.addEventListener('resize', computeFitScale);
            return () => window.removeEventListener('resize', computeFitScale);
      }, []);

      const handlePrint = () => {
            window.print();
      };

      const handleFit = () => {
            setZoom(fitScale);
      };

      return (
            <div className="preview-modal-overlay" onClick={onClose}>
                  <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header Bar */}
                        <div className="preview-header">
                              <div className="preview-header-main">
                                    <div className="preview-title-wrap">
                                          <h2>📄 Resume Preview</h2>
                                          <span className="template-badge">{template.toUpperCase()}</span>
                                    </div>
                                    <div className="preview-quick-actions">
                                          <button
                                                className="btn btn-sm btn-secondary fit-btn"
                                                onClick={handleFit}
                                                title="Fit to Screen Width"
                                          >
                                                📱 Fit Screen
                                          </button>
                                          <button
                                                className="btn btn-sm btn-primary"
                                                onClick={handlePrint}
                                                title="Print / Save as PDF"
                                          >
                                                🖨️ Print
                                          </button>
                                          <button
                                                className="preview-close-btn"
                                                onClick={onClose}
                                                title="Close"
                                          >
                                                ✕
                                          </button>
                                    </div>
                              </div>

                              {/* Secondary Toolbar (Scrollable on Mobile) */}
                              <div className="preview-toolbar-scrollable">
                                    {/* Template Switcher */}
                                    <div className="preview-template-pills">
                                          {['modern', 'executive', 'tech', 'compact'].map((t) => (
                                                <button
                                                      key={t}
                                                      className={`pill-btn ${template === t ? 'active' : ''}`}
                                                      onClick={() => setTemplate(t)}
                                                >
                                                      {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                          ))}
                                    </div>

                                    {/* Color Picker Dots */}
                                    <div className="preview-color-dots">
                                          {colorPresets.map((c) => (
                                                <button
                                                      key={c}
                                                      className={`color-dot ${accentColor === c ? 'selected' : ''}`}
                                                      style={{ backgroundColor: c }}
                                                      onClick={() => setAccentColor(c)}
                                                      title={c}
                                                />
                                          ))}
                                    </div>

                                    {/* Zoom Controls */}
                                    <div className="zoom-controls">
                                          <button onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))} title="Zoom Out">-</button>
                                          <span onClick={handleFit} style={{ cursor: 'pointer' }} title="Click to auto-fit">{Math.round(zoom * 100)}%</span>
                                          <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} title="Zoom In">+</button>
                                          <button onClick={() => setZoom(1)} title="100% Zoom">1:1</button>
                                    </div>
                              </div>
                        </div>

                        {/* Preview Document Viewport */}
                        <div className="preview-content" ref={containerRef}>
                              <div
                                    className="resume-scaler-wrapper"
                                    style={{
                                          width: `${Math.round(760 * zoom)}px`,
                                          minHeight: `${Math.round(1020 * zoom)}px`,
                                          position: 'relative'
                                    }}
                              >
                                    <div
                                          className={`resume-page tpl-${template}`}
                                          style={{
                                                backgroundColor: pdf_preferences?.background_color || '#ffffff',
                                                '--accent-color': accentColor,
                                                transform: `scale(${zoom})`,
                                                transformOrigin: 'top left',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '760px'
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

                                          {/* Achievements */}
                                          {achievements && achievements.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor }}>Key Achievements</h3>
                                                      <ul>
                                                            {achievements.map((ach, index) => (
                                                                  <li key={index}>
                                                                        <strong>{ach.title}</strong>: {ach.description}
                                                                  </li>
                                                            ))}
                                                      </ul>
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      );
}

export default ResumePreview;

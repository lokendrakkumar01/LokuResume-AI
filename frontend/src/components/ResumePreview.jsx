import React, { useState, useEffect, useRef } from 'react';
import '../styles/ResumePreview.css';

// Professional SVG Icons
const MailIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
      </svg>
);

const PhoneIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
);

const MapPinIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
      </svg>
);

const GitHubIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
);

const LinkedInIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
);

const GlobeIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
      </svg>
);

const CodeIcon = () => (
      <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
);

const ExternalLinkIcon = () => (
      <svg style={{ width: 11, height: 11, marginLeft: 3, verticalAlign: 'middle', opacity: 0.8 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
);

const formatUrl = (url) => {
      if (!url) return '';
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
            return `https://${trimmed}`;
      }
      return trimmed;
};

const getDisplayLabel = (url, fallback) => {
      if (!url) return fallback;
      try {
            const clean = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
            return clean.length > 25 ? fallback : clean;
      } catch {
            return fallback;
      }
};

function ResumePreview({ formData, onClose }) {
      const [template, setTemplate] = useState(formData.template_style || 'modern');
      const [accentColor, setAccentColor] = useState(formData.pdf_preferences?.accent_color || '#e11d48');
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

      const colorPresets = ['#e11d48', '#4f46e5', '#059669', '#2563eb', '#7c3aed', '#0f766e', '#1e293b'];

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
                                                            {personal_info.email && (
                                                                  <a href={`mailto:${personal_info.email}`} className="contact-link" title={`Send email to ${personal_info.email}`}>
                                                                        <MailIcon />
                                                                        <span>{personal_info.email}</span>
                                                                  </a>
                                                            )}
                                                            {personal_info.phone && (
                                                                  <a href={`tel:${personal_info.phone}`} className="contact-link" title={`Call ${personal_info.phone}`}>
                                                                        <PhoneIcon />
                                                                        <span>{personal_info.phone}</span>
                                                                  </a>
                                                            )}
                                                            {personal_info.location && (
                                                                  <span className="contact-item" title={`Location: ${personal_info.location}`}>
                                                                        <MapPinIcon />
                                                                        <span>{personal_info.location}</span>
                                                                  </span>
                                                            )}
                                                            {personal_info.github && (
                                                                  <a href={formatUrl(personal_info.github)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Visit GitHub Profile">
                                                                        <GitHubIcon />
                                                                        <span>{getDisplayLabel(personal_info.github, 'GitHub')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {personal_info.linkedin && (
                                                                  <a href={formatUrl(personal_info.linkedin)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Visit LinkedIn Profile">
                                                                        <LinkedInIcon />
                                                                        <span>{getDisplayLabel(personal_info.linkedin, 'LinkedIn')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {personal_info.portfolio && (
                                                                  <a href={formatUrl(personal_info.portfolio)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Visit Portfolio">
                                                                        <GlobeIcon />
                                                                        <span>{getDisplayLabel(personal_info.portfolio, 'Portfolio')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {personal_info.leetcode && (
                                                                  <a href={formatUrl(personal_info.leetcode)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Visit LeetCode Profile">
                                                                        <CodeIcon />
                                                                        <span>{getDisplayLabel(personal_info.leetcode, 'LeetCode')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
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
                                                      <p><strong>Technical Skills:</strong> {skills.map(s => (typeof s === 'object' ? s?.name || '' : String(s))).filter(Boolean).join(' • ')}</p>
                                                </div>
                                          )}

                                          {/* Projects */}
                                          {projects && projects.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor }}>Projects</h3>
                                                      {projects.map((proj, index) => (
                                                            <div key={index} className="section-item" style={{ marginBottom: 12 }}>
                                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                                                                        <h4>
                                                                              {proj?.title || 'Project'} {proj?.technologies && <em style={{ fontWeight: 'normal', color: '#64748b' }}>({proj.technologies})</em>}
                                                                        </h4>
                                                                        {(proj?.link || proj?.live_url || proj?.github_url) && (
                                                                              <a
                                                                                    href={formatUrl(proj?.link || proj?.live_url || proj?.github_url)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ color: accentColor, fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
                                                                              >
                                                                                    Live Demo <ExternalLinkIcon />
                                                                              </a>
                                                                        )}
                                                                  </div>
                                                                  <p>{proj?.description || ''}</p>
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
                                                                  <h4>{exp?.role || 'Role'} - {exp?.company || 'Company'} <span style={{ float: 'right', fontWeight: 'normal', fontSize: '0.85rem' }}>{exp?.duration || ''}</span></h4>
                                                                  <p>{exp?.description || ''}</p>
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
                                                                  <h4>{edu?.degree || 'Degree'} - {edu?.college || 'Institution'} <span style={{ float: 'right', fontWeight: 'normal' }}>{edu?.year || ''}</span></h4>
                                                                  {edu?.grade && <p>Grade: {edu.grade}</p>}
                                                            </div>
                                                      ))}
                                                </div>
                                          )}

                                          {/* Coding Profiles */}
                                          {coding_profiles && coding_profiles.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor }}>Coding Profiles</h3>
                                                      {coding_profiles.map((prof, index) => (
                                                            <div key={index} className="profile-item" style={{ marginBottom: 6 }}>
                                                                  <strong style={{ color: '#0f172a' }}>{prof?.platform || 'Profile'}:</strong> {prof?.headline || ''}{' '}
                                                                  {prof?.link && (
                                                                        <a
                                                                              href={formatUrl(prof.link)}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              style={{ color: accentColor, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}
                                                                        >
                                                                              View Profile <ExternalLinkIcon />
                                                                        </a>
                                                                  )}
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
                                                                        {typeof cert === 'string' ? cert : `${cert?.name || 'Certification'} ${cert?.issued_by ? `- ${cert.issued_by}` : ''}`}
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
                                                                        <strong>{ach?.title || 'Achievement'}</strong>: {ach?.description || ''}
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

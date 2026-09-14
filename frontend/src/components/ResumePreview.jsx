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

function ResumePreview({ formData = {}, score, onDownloadPDF, onUpdatePreferences, onClose }) {
      const safeFormData = formData || {};
      const [template, setTemplate] = useState(safeFormData.template_style || 'modern');
      const [accentColor, setAccentColor] = useState(safeFormData.pdf_preferences?.accent_color || '#111827');
      const [includePhoto, setIncludePhoto] = useState(
            safeFormData.pdf_preferences?.include_photo !== undefined
                  ? safeFormData.pdf_preferences.include_photo
                  : (!!safeFormData.personal_info?.profile_photo)
      );
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
            languages = [],
            interests = [],
            custom_sections = [],
            pdf_preferences = {}
      } = safeFormData;

      const effectiveScore = score !== undefined ? score : (safeFormData.score || 0);
      const isUnlocked = effectiveScore >= 50;

      // 5 Standard Platform Colors: Black (#111827), Blue (#1e40af), Green (#059669), Purple (#7c3aed), Red (#dc2626)
      const colorPresets = [
            { name: 'Black', hex: '#111827' },
            { name: 'Blue', hex: '#1e40af' },
            { name: 'Green', hex: '#059669' },
            { name: 'Purple', hex: '#7c3aed' },
            { name: 'Red', hex: '#dc2626' }
      ];

      // Auto-compute fit scale on mount and resize
      useEffect(() => {
            const computeFitScale = () => {
                  if (containerRef.current) {
                        const availableWidth = containerRef.current.clientWidth - 32;
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

      // Keep state in sync if parent formData updates
      useEffect(() => {
            if (safeFormData.template_style) setTemplate(safeFormData.template_style);
            if (safeFormData.pdf_preferences?.accent_color) setAccentColor(safeFormData.pdf_preferences.accent_color);
            if (safeFormData.pdf_preferences?.include_photo !== undefined) {
                  setIncludePhoto(safeFormData.pdf_preferences.include_photo);
            }
      }, [safeFormData.template_style, safeFormData.pdf_preferences?.accent_color, safeFormData.pdf_preferences?.include_photo]);

      const handleFit = () => {
            setZoom(fitScale);
      };

      const handlePrint = () => {
            window.print();
      };

      const handleViewCertProof = (e, certItem, certIndex) => {
            e.preventDefault();
            const resumeId = safeFormData.id || safeFormData._id;
            if (resumeId) {
                  window.open(`/verify-certificate/${resumeId}/${certIndex}`, '_blank');
                  return;
            }
            if (certItem?.file_url && (certItem.file_url.startsWith('http://') || certItem.file_url.startsWith('https://'))) {
                  window.open(certItem.file_url, '_blank');
                  return;
            }
            if (certItem?.file_data && certItem.file_data.startsWith('data:')) {
                  try {
                        const parts = certItem.file_data.split(',');
                        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
                        const byteCharacters = atob(parts[1]);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: mime });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                        return;
                  } catch (err) {
                        console.error('Error opening blob file:', err);
                  }
            }
            if (certItem?.link && /^https?:\/\//i.test(certItem.link)) {
                  window.open(formatUrl(certItem.link), '_blank');
            }
      };

      const handleTogglePhoto = (val) => {
            setIncludePhoto(val);
            if (onUpdatePreferences) {
                  onUpdatePreferences({ template_style: template, accent_color: accentColor, include_photo: val });
            }
      };

      const handleTemplateChange = (t) => {
            setTemplate(t);
            if (onUpdatePreferences) {
                  onUpdatePreferences({ template_style: t, accent_color: accentColor, include_photo: includePhoto });
            }
      };

      const handleColorChange = (c) => {
            setAccentColor(c);
            if (onUpdatePreferences) {
                  onUpdatePreferences({ template_style: template, accent_color: c, include_photo: includePhoto });
            }
      };

      const handleDownloadClick = () => {
            if (!isUnlocked) {
                  alert(`Resume score is ${effectiveScore}%. PDF download unlocks once your resume completeness reaches 50% or higher. Please complete your skills, projects, certifications, or achievements.`);
                  return;
            }
            if (onDownloadPDF) {
                  onDownloadPDF({ template_style: template, accent_color: accentColor, include_photo: includePhoto });
            } else {
                  window.print();
            }
      };

      // Helper to partition skills into Hard & Soft Skills if possible
      const softSkillNames = ['collaboration', 'problem-solving', 'problem solving', 'teamwork', 'communication', 'leadership', 'adaptability', 'critical thinking'];
      const rawSkillsList = (skills || []).map(s => (typeof s === 'object' ? s?.name || '' : String(s))).filter(Boolean);
      const hardSkills = rawSkillsList.filter(s => !softSkillNames.includes(s.toLowerCase()));
      const softSkills = rawSkillsList.filter(s => softSkillNames.includes(s.toLowerCase()));

      return (
            <div className="preview-modal-overlay" onClick={onClose}>
                  <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Header Bar */}
                        <div className="preview-header">
                              <div className="preview-header-main">
                                    <div className="preview-title-wrap">
                                          <h2>📄 Resume Preview</h2>
                                          <span className="template-badge">{template.toUpperCase()}</span>
                                          <span
                                                style={{
                                                      fontSize: '0.78rem',
                                                      fontWeight: 700,
                                                      padding: '2px 8px',
                                                      borderRadius: '12px',
                                                      background: isUnlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                      color: isUnlocked ? '#10b981' : '#f59e0b',
                                                      border: `1px solid ${isUnlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                                }}
                                          >
                                                Score: {effectiveScore}% {isUnlocked ? '✓ Unlocked' : '🔒 (50% to download)'}
                                          </span>
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
                                                className="btn btn-sm btn-secondary"
                                                onClick={handlePrint}
                                                title="Print Preview"
                                          >
                                                🖨️ Print
                                          </button>
                                          {isUnlocked ? (
                                                <button
                                                      className="btn btn-sm btn-success"
                                                      onClick={handleDownloadClick}
                                                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', fontWeight: 600 }}
                                                      title="Download Official PDF"
                                                >
                                                      📄 Download PDF
                                                </button>
                                          ) : (
                                                <button
                                                      className="btn btn-sm btn-secondary"
                                                      onClick={handleDownloadClick}
                                                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                                                      title={`Resume score is ${effectiveScore}%. Reach 50% to download official PDF.`}
                                                >
                                                      🔒 Download PDF ({effectiveScore}% / 50%)
                                                </button>
                                          )}
                                          <button
                                                className="preview-close-btn"
                                                onClick={onClose}
                                                title="Close"
                                          >
                                                ✕
                                          </button>
                                    </div>
                              </div>

                              {/* Secondary Toolbar */}
                              <div className="preview-toolbar-scrollable">
                                    <div className="preview-template-pills">
                                          {['modern', 'executive', 'tech', 'compact'].map((t) => (
                                                <button
                                                      key={t}
                                                      className={`pill-btn ${template === t ? 'active' : ''}`}
                                                      onClick={() => handleTemplateChange(t)}
                                                >
                                                      {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                          ))}
                                    </div>

                                    <div className="preview-color-dots">
                                          {colorPresets.map((c) => (
                                                <button
                                                      key={c.hex}
                                                      className={`color-dot ${(accentColor || '#111827').toLowerCase() === c.hex.toLowerCase() ? 'selected' : ''}`}
                                                      style={{ backgroundColor: c.hex }}
                                                      onClick={() => handleColorChange(c.hex)}
                                                      title={`${c.name} (${c.hex})`}
                                                />
                                          ))}
                                    </div>

                                    {personal_info?.profile_photo && (
                                          <button
                                                type="button"
                                                className={`photo-toggle-pill ${includePhoto ? 'active' : 'off'}`}
                                                onClick={() => handleTogglePhoto(!includePhoto)}
                                                title={includePhoto ? "Photo is currently ON. Click to hide photo." : "Photo is currently OFF. Click to show photo."}
                                          >
                                                {includePhoto ? '📷 Photo: ON' : '📷 Photo: OFF'}
                                          </button>
                                    )}

                                    <div className="zoom-controls">
                                          <button onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))} title="Zoom Out">-</button>
                                          <span onClick={handleFit} style={{ cursor: 'pointer' }} title="Click to auto-fit">{Math.round(zoom * 100)}%</span>
                                          <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} title="Zoom In">+</button>
                                          <button onClick={() => setZoom(1)} title="100% Zoom">1:1</button>
                                    </div>
                              </div>
                        </div>

                        {/* Document Viewport */}
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
                                                width: '760px',
                                                fontFamily: 'Inter, Segoe UI, Arial, sans-serif'
                                          }}
                                    >
                                          {/* Header matching Reference Image */}
                                          <div className="resume-header" style={{ textAlign: template === 'executive' ? 'center' : 'left', marginBottom: '16px' }}>
                                                {includePhoto && personal_info.profile_photo && (
                                                      <img
                                                            src={personal_info.profile_photo}
                                                            alt="Profile"
                                                            style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', float: 'right' }}
                                                      />
                                                )}
                                                <div>
                                                      <h1 className="name" style={{ margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                            {personal_info.name || 'Your Name'}
                                                      </h1>
                                                      {personal_info.headline && (
                                                            <p className="title" style={{ margin: '0 0 8px 0', fontSize: '0.92rem', fontStyle: 'italic', color: '#475569' }}>
                                                                  {personal_info.headline}
                                                            </p>
                                                      )}
                                                      <div className="contact-links" style={{ justifyContent: template === 'executive' ? 'center' : 'flex-start' }}>
                                                            {personal_info.email && (
                                                                  <a href={`mailto:${personal_info.email}`} className="contact-link" title={`Email: ${personal_info.email}`}>
                                                                        <MailIcon />
                                                                        <span>{personal_info.email}</span>
                                                                  </a>
                                                            )}
                                                            {personal_info.phone && (
                                                                  <a href={`tel:${personal_info.phone}`} className="contact-link" title={`Phone: ${personal_info.phone}`}>
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
                                                                  <a href={formatUrl(personal_info.github)} target="_blank" rel="noopener noreferrer" className="contact-link" title="GitHub">
                                                                        <GitHubIcon />
                                                                        <span>{getDisplayLabel(personal_info.github, 'GitHub')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {personal_info.linkedin && (
                                                                  <a href={formatUrl(personal_info.linkedin)} target="_blank" rel="noopener noreferrer" className="contact-link" title="LinkedIn">
                                                                        <LinkedInIcon />
                                                                        <span>{getDisplayLabel(personal_info.linkedin, 'LinkedIn')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {personal_info.portfolio && (
                                                                  <a href={formatUrl(personal_info.portfolio)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Portfolio">
                                                                        <GlobeIcon />
                                                                        <span>{getDisplayLabel(personal_info.portfolio, 'Portfolio')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                            {(personal_info.leetcode || personal_info.problem_solving) && (
                                                                  <a href={formatUrl(personal_info.leetcode || personal_info.problem_solving)} target="_blank" rel="noopener noreferrer" className="contact-link" title="Problem Solving Profile">
                                                                        <CodeIcon />
                                                                        <span>{getDisplayLabel(personal_info.leetcode || personal_info.problem_solving, 'LeetCode')}</span>
                                                                        <ExternalLinkIcon />
                                                                  </a>
                                                            )}
                                                      </div>
                                                </div>
                                          </div>

                                          {/* SUMMARY */}
                                          {summary && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            SUMMARY
                                                      </h3>
                                                      <p style={{ margin: '4px 0', fontSize: '0.88rem', lineHeight: 1.45, color: '#1e293b' }}>
                                                            {summary}
                                                      </p>
                                                </div>
                                          )}

                                          {/* SKILLS */}
                                          {rawSkillsList.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            SKILLS
                                                      </h3>
                                                      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, color: '#1e293b' }}>
                                                            {hardSkills.length > 0 && (
                                                                  <p style={{ margin: '3px 0' }}>
                                                                        <strong>Hard Skills:</strong> {hardSkills.join(', ')}
                                                                  </p>
                                                            )}
                                                            {softSkills.length > 0 && (
                                                                  <p style={{ margin: '3px 0' }}>
                                                                        <strong>Soft Skills:</strong> {softSkills.join(', ')}
                                                                  </p>
                                                            )}
                                                            {hardSkills.length === 0 && softSkills.length === 0 && (
                                                                  <p style={{ margin: '3px 0' }}>
                                                                        <strong>Technical Skills:</strong> {rawSkillsList.join(', ')}
                                                                  </p>
                                                            )}
                                                      </div>
                                                </div>
                                          )}

                                          {/* TECHNICAL PROJECTS */}
                                          {projects && projects.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            TECHNICAL PROJECTS
                                                      </h3>
                                                      {projects.map((proj, index) => {
                                                            const repoLink = proj?.repository_url || proj?.github_url;
                                                            const demoLink = proj?.live_demo_url || proj?.live_url || proj?.link;
                                                            return (
                                                                  <div key={index} className="section-item" style={{ marginBottom: '12px' }}>
                                                                        {/* Row 1: Title (Tech) + Year */}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                    {proj?.title || 'Project'}
                                                                                    {proj?.technologies && (
                                                                                          <span style={{ fontWeight: 400, fontStyle: 'italic', color: '#475569', marginLeft: '6px' }}>
                                                                                                ({proj.technologies})
                                                                                          </span>
                                                                                    )}
                                                                              </span>
                                                                              {proj?.date && (
                                                                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                          {proj.date}
                                                                                    </span>
                                                                              )}
                                                                        </div>

                                                                        {/* Row 2: Dual Links (GitHub Repository | Live Demo) */}
                                                                        {(repoLink || demoLink) && (
                                                                              <div style={{ marginTop: '2px', fontSize: '0.82rem', fontWeight: 600 }}>
                                                                                    {repoLink && (
                                                                                          <a
                                                                                                href={formatUrl(repoLink)}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                style={{ color: accentColor, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                                                          >
                                                                                                GitHub Repository <ExternalLinkIcon />
                                                                                          </a>
                                                                                    )}
                                                                                    {repoLink && demoLink && <span style={{ margin: '0 8px', color: '#94a3b8' }}>|</span>}
                                                                                    {demoLink && (
                                                                                          <a
                                                                                                href={formatUrl(demoLink)}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                style={{ color: accentColor, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                                                          >
                                                                                                Live Demo <ExternalLinkIcon />
                                                                                          </a>
                                                                                    )}
                                                                              </div>
                                                                        )}

                                                                        {/* Row 3: Description Bullet Point */}
                                                                        {proj?.description && (
                                                                              <div style={{ marginTop: '4px', fontSize: '0.86rem', lineHeight: 1.45, color: '#334155' }}>
                                                                                    <span style={{ marginRight: '6px', color: '#64748b' }}>•</span>
                                                                                    {proj.description}
                                                                              </div>
                                                                        )}
                                                                  </div>
                                                            );
                                                      })}
                                                </div>
                                          )}

                                          {/* WORK EXPERIENCE */}
                                          {experience && experience.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            WORK EXPERIENCE
                                                      </h3>
                                                      {experience.map((exp, index) => (
                                                            <div key={index} className="section-item" style={{ marginBottom: '10px' }}>
                                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                                                              {exp?.role || 'Role'} - {exp?.company || 'Company'}
                                                                        </span>
                                                                        {exp?.duration && (
                                                                              <span style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
                                                                                    {exp.duration}
                                                                              </span>
                                                                        )}
                                                                  </div>
                                                                  {exp?.description && (
                                                                        <div style={{ marginTop: '4px', fontSize: '0.86rem', lineHeight: 1.45, color: '#334155' }}>
                                                                              <span style={{ marginRight: '6px', color: '#64748b' }}>•</span>
                                                                              {exp.description}
                                                                        </div>
                                                                  )}
                                                            </div>
                                                      ))}
                                                </div>
                                          )}

                                          {/* PROBLEM SOLVING & DATA STRUCTURES */}
                                          {coding_profiles && coding_profiles.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            PROBLEM SOLVING &amp; DATA STRUCTURES
                                                      </h3>
                                                      {coding_profiles.map((prof, index) => (
                                                            <div key={index} style={{ marginBottom: '6px', fontSize: '0.88rem', lineHeight: 1.4, color: '#1e293b' }}>
                                                                  <span style={{ marginRight: '6px', color: '#64748b' }}>•</span>
                                                                  <strong style={{ color: '#0f172a' }}>{prof?.platform || 'Profile'}:</strong>{' '}
                                                                  {prof?.headline || ''}{' '}
                                                                  {prof?.link && (
                                                                        <a
                                                                              href={formatUrl(prof.link)}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              style={{ color: accentColor, fontWeight: 600, textDecoration: 'none', marginLeft: '6px', display: 'inline-flex', alignItems: 'center' }}
                                                                        >
                                                                              View Profile <ExternalLinkIcon />
                                                                        </a>
                                                                  )}
                                                            </div>
                                                      ))}
                                                </div>
                                          )}

                                          {/* EDUCATION */}
                                          {education && education.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            EDUCATION
                                                      </h3>
                                                      {education.map((edu, index) => (
                                                            <div key={index} className="section-item" style={{ marginBottom: '8px' }}>
                                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                                                              {edu?.degree || 'Degree'}
                                                                        </span>
                                                                        {edu?.grade && (
                                                                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                    {edu.grade}
                                                                              </span>
                                                                        )}
                                                                  </div>
                                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                        <span style={{ fontSize: '0.86rem', color: '#475569' }}>
                                                                              {edu?.college || 'Institution'}
                                                                        </span>
                                                                        {edu?.year && (
                                                                              <span style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 500 }}>
                                                                                    {edu.year}
                                                                              </span>
                                                                        )}
                                                                  </div>
                                                            </div>
                                                      ))}
                                                </div>
                                          )}

                                          {/* CERTIFICATIONS */}
                                          {certifications && certifications.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            CERTIFICATIONS
                                                      </h3>
                                                      {certifications.map((cert, index) => {
                                                            const certName = typeof cert === 'string' ? cert : (cert?.name || 'Certification');
                                                            const issuer = typeof cert === 'object' ? cert?.issued_by : '';
                                                            const date = typeof cert === 'object' ? cert?.date : '';
                                                            const link = typeof cert === 'object' ? cert?.link : '';
                                                            const hasFile = typeof cert === 'object' && Boolean(cert?.file_data || cert?.file_url);
                                                            const skillsLearned = typeof cert === 'object' ? cert?.skills_learned : '';
                                                            const resId = safeFormData.id || safeFormData._id;

                                                            return (
                                                                  <div key={index} className="section-item" style={{ marginBottom: '10px' }}>
                                                                        {/* Row 1: Cert Name + Date */}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                    {certName}
                                                                              </span>
                                                                              {date && (
                                                                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                          {date}
                                                                                    </span>
                                                                              )}
                                                                        </div>

                                                                        {/* Row 2: Issuer + Proof Link / Certificate Link */}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                              <span style={{ fontSize: '0.86rem', color: '#475569' }}>
                                                                                    {issuer}
                                                                              </span>
                                                                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                                    {link && (
                                                                                          <a
                                                                                                href={formatUrl(link)}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                style={{ color: accentColor, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                                                          >
                                                                                                Verify Credential <ExternalLinkIcon />
                                                                                          </a>
                                                                                    )}
                                                                                    {hasFile && (
                                                                                          <a
                                                                                                href={resId ? `/verify-certificate/${resId}/${index}` : '#'}
                                                                                                onClick={(e) => handleViewCertProof(e, cert, index)}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                                                                title="View verified certificate proof"
                                                                                          >
                                                                                                Verify Proof 📎
                                                                                          </a>
                                                                                    )}
                                                                              </div>
                                                                        </div>

                                                                        {/* Row 3: Skills Learned (Matching reference screenshot) */}
                                                                        {skillsLearned && (
                                                                              <div style={{ marginTop: '3px', fontSize: '0.84rem', color: '#475569', paddingLeft: '8px' }}>
                                                                                    <span style={{ marginRight: '6px', color: '#94a3b8' }}>•</span>
                                                                                    <em>Skills learned:</em> <strong>{skillsLearned}</strong>
                                                                              </div>
                                                                        )}
                                                                  </div>
                                                            );
                                                      })}
                                                </div>
                                          )}

                                          {/* ACHIEVEMENTS */}
                                          {achievements && achievements.length > 0 && (
                                                <div className="resume-section">
                                                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            ACHIEVEMENTS
                                                      </h3>
                                                      {achievements.map((ach, index) => {
                                                            const title = typeof ach === 'string' ? ach : (ach?.title || 'Achievement');
                                                            const date = typeof ach === 'object' ? ach?.date : '';
                                                            const desc = typeof ach === 'object' ? ach?.description : '';
                                                            const link = typeof ach === 'object' ? (ach?.link || ach?.file_url) : '';

                                                            return (
                                                                  <div key={index} style={{ marginBottom: '8px', fontSize: '0.88rem', lineHeight: 1.45, color: '#1e293b' }}>
                                                                        <span style={{ marginRight: '6px', color: '#64748b' }}>•</span>
                                                                        <strong style={{ color: '#0f172a' }}>{title}</strong>
                                                                        {date && <span style={{ color: '#475569', fontWeight: 600 }}> ({date})</span>}
                                                                        {desc && <span>: {desc}</span>}
                                                                        {link && (
                                                                              <a
                                                                                    href={formatUrl(link)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ color: accentColor, fontWeight: 600, textDecoration: 'none', marginLeft: '6px', display: 'inline-flex', alignItems: 'center' }}
                                                                              >
                                                    [View Proof <ExternalLinkIcon />]
                                              </a>
                                        )}
                                  </div>
                            );
                      })}
                </div>
          )}

          {/* LANGUAGES */}
          {languages && languages.length > 0 && (
                <div className="resume-section">
                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            LANGUAGES
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                            {languages.map((lang, idx) => (
                                  <span key={idx} style={{ background: '#f1f5f9', color: '#1e293b', padding: '3px 10px', borderRadius: '4px', fontSize: '0.84rem', fontWeight: 600 }}>
                                        {typeof lang === 'string' ? lang : (lang?.name || lang?.language || '')}
                                  </span>
                            ))}
                      </div>
                </div>
          )}

          {/* INTERESTS */}
          {interests && interests.length > 0 && (
                <div className="resume-section">
                      <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            INTERESTS
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                            {interests.map((interest, idx) => (
                                  <span key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', padding: '3px 10px', borderRadius: '4px', fontSize: '0.84rem' }}>
                                        {typeof interest === 'string' ? interest : (interest?.name || '')}
                                  </span>
                            ))}
                      </div>
                </div>
          )}

          {/* CUSTOM SECTIONS */}
          {custom_sections && custom_sections.length > 0 && (
                custom_sections.map((sec, idx) => (
                      <div key={idx} className="resume-section">
                            <h3 style={{ color: accentColor, borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {sec.title || 'ADDITIONAL SECTION'}
                            </h3>
                            <div style={{ marginTop: '6px', fontSize: '0.88rem', lineHeight: 1.5, color: '#334155', whiteSpace: 'pre-wrap' }}>
                                  {sec.content || ''}
                            </div>
                      </div>
                ))
          )}
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      );
}

export default ResumePreview;

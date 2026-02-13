import React from 'react';
import '../styles/ResumePreview.css';

function ResumePreview({ formData, onClose }) {
      const { personal_info, summary, education, skills, projects, experience, certifications, achievements, pdf_preferences } = formData;

      return (
            <div className="preview-modal-overlay" onClick={onClose}>
                  <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-header">
                              <h2>Resume Preview</h2>
                              <button className="close-btn" onClick={onClose}>×</button>
                        </div>

                        <div className="preview-content">
                              <div className="resume-page" style={{ backgroundColor: pdf_preferences?.background_color || '#ffffff' }}>
                                    {/* Header */}
                                    <div className="resume-header">
                                          {personal_info.profile_photo && (
                                                <img
                                                      src={personal_info.profile_photo}
                                                      alt="Profile"
                                                      className="preview-photo"
                                                />
                                          )}
                                          <div className="header-info">
                                                <h1 className="name">{personal_info.name || 'Your Name'}</h1>
                                                <p className="title">{personal_info.headline || 'Full-Stack Developer | MERN & Java | Web Applications'}</p>
                                                <div className="contact-links">
                                                      {personal_info.email && <span>{personal_info.email}</span>}
                                                      {personal_info.phone && <span>{personal_info.phone}</span>}
                                                      {personal_info.github && <span>GitHub</span>}
                                                      {personal_info.linkedin && <span>LinkedIn</span>}
                                                      {personal_info.leetcode && <span>LeetCode</span>}
                                                </div>
                                          </div>
                                    </div>

                                    <hr className="section-divider" />

                                    {/* Skills */}
                                    {skills && skills.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Skills</h3>
                                                <p><strong>Hard Skills:</strong> {skills.join(', ')}</p>
                                          </div>
                                    )}

                                    {/* Projects */}
                                    {projects && projects.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Technical Projects</h3>
                                                {projects.map((project, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{project.title}</h4>
                                                            <p className="tech-stack"><em>{project.technologies}</em></p>
                                                            <p>{project.description}</p>
                                                            {(project.repository_url || project.live_demo_url) && (
                                                                  <div className="project-links">
                                                                        {project.repository_url && <a href={project.repository_url} target="_blank" rel="noopener noreferrer">Repository</a>}
                                                                        {project.live_demo_url && <a href={project.live_demo_url} target="_blank" rel="noopener noreferrer">Live Demo</a>}
                                                                  </div>
                                                            )}
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Education */}
                                    {education && education.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Education</h3>
                                                {education.map((edu, index) => (
                                                      <div key={index} className="section-item edu-item">
                                                            <div className="edu-content">
                                                                  <h4>{edu.degree}</h4>
                                                                  <p>{edu.college}</p>
                                                                  {edu.grade && <p><strong>CGPA:</strong> {edu.grade}</p>}
                                                            </div>
                                                            <div className="edu-year">{edu.year}</div>
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Summary */}
                                    {summary && (
                                          <div className="resume-section">
                                                <h3>Professional Summary</h3>
                                                <p>{summary}</p>
                                          </div>
                                    )}

                                    {/* Experience */}
                                    {experience && experience.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Professional Experience</h3>
                                                {experience.map((exp, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{exp.role} at {exp.company}</h4>
                                                            <p className="duration"><em>{exp.duration}</em></p>
                                                            <p>{exp.description}</p>
                                                      </div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Certifications */}
                                    {certifications && certifications.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Certifications</h3>
                                                <ul className="cert-list">
                                                      {certifications.map((cert, index) => {
                                                            const certName = typeof cert === 'string' ? cert : cert.name;
                                                            const certIssuer = typeof cert === 'object' ? cert.issued_by : '';
                                                            const certDate = typeof cert === 'object' ? cert.date : '';
                                                            return (
                                                                  <li key={index}>
                                                                        {certName}
                                                                        {certIssuer && ` - ${certIssuer}`}
                                                                        {certDate && ` (${certDate})`}
                                                                  </li>
                                                            );
                                                      })}
                                                </ul>
                                          </div>
                                    )}

                                    {/* Achievements */}
                                    {achievements && achievements.length > 0 && (
                                          <div className="resume-section">
                                                <h3>Achievements & Awards</h3>
                                                {achievements.map((achievement, index) => (
                                                      <div key={index} className="section-item">
                                                            <h4>{achievement.title}</h4>
                                                            {achievement.date && <p className="duration"><em>{achievement.date}</em></p>}
                                                            <p>{achievement.description}</p>
                                                      </div>
                                                ))}
                                          </div>
                                    )}
                              </div>
                        </div>
                  </div>
            </div>
      );
}

export default ResumePreview;

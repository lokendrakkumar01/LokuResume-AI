import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import config from '../config';
import '../styles/Auth.css';

function CertificateVerifier() {
      const { resumeId, certIndex } = useParams();
      const [loading, setLoading] = useState(true);
      const [certData, setCertData] = useState(null);
      const [error, setError] = useState(null);

      useEffect(() => {
            let isMounted = true;
            const fetchCertificate = async () => {
                  try {
                        setLoading(true);
                        setError(null);
                        const response = await axios.get(
                              `${config.API_BASE_URL}/resumes/${resumeId}/certificates/${certIndex}/public`,
                              { timeout: 12000 }
                        );
                        if (isMounted) {
                              setCertData(response.data);
                        }
                  } catch (err) {
                        if (isMounted) {
                              console.error('Failed to load certificate:', err);
                              setError(err.response?.data?.detail || 'Certificate not found or verification link expired.');
                        }
                  } finally {
                        if (isMounted) setLoading(false);
                  }
            };

            if (resumeId && certIndex !== undefined) {
                  fetchCertificate();
            } else {
                  setError('Invalid certificate parameters.');
                  setLoading(false);
            }

            return () => {
                  isMounted = false;
            };
      }, [resumeId, certIndex]);

      const isCloudinary = Boolean(
            certData?.file_url && (certData.file_url.startsWith('http://') || certData.file_url.startsWith('https://'))
      );

      const isPdf = Boolean(
            (certData?.file_data && certData.file_data.includes('application/pdf')) ||
            (certData?.file_url && (certData.file_url.toLowerCase().endsWith('.pdf') || certData.file_url.toLowerCase().includes('.pdf')))
      );

      const fileSrc = isCloudinary
            ? certData.file_url
            : `${config.API_BASE_URL}/resumes/${resumeId}/certificates/${certIndex}/file`;

      return (
            <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(225, 29, 72, 0.08) 0%, #0f172a 100%)', color: '#f8fafc', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Top Navigation Bar */}
                  <header style={{ width: '100%', maxWidth: '880px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>
                              <span style={{ fontSize: '1.5rem' }}>✨</span> {config.APP_NAME}
                        </Link>
                        <Link to="/" style={{ padding: '0.45rem 0.95rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                              Create Your AI Resume →
                        </Link>
                  </header>

                  {/* Main Content Container */}
                  <main style={{ width: '100%', maxWidth: '880px', background: '#1e293b', borderRadius: '20px', border: '1px solid rgba(225, 29, 72, 0.25)', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        {loading ? (
                              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                                    <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#e11d48', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
                                    <h3 style={{ fontSize: '1.15rem', color: '#e2e8f0', margin: 0 }}>Authenticating Credential Proof...</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Verifying tamper-proof digital signature via CVNex</p>
                              </div>
                        ) : error ? (
                              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                                    <h2 style={{ fontSize: '1.5rem', color: '#f87171', marginBottom: '0.75rem' }}>Certificate Verification Error</h2>
                                    <p style={{ color: '#94a3b8', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>{error}</p>
                                    <Link to="/" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.65rem 1.5rem' }}>
                                          Return to Home
                                    </Link>
                              </div>
                        ) : (
                              <div>
                                    {/* Verification Stamp Badge */}
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                      <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Official Authenticated Credential
                                          </div>
                                          {isCloudinary && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
                                                      ⚡ Cloud CDN Authenticated
                                                </div>
                                          )}
                                    </div>

                                    {/* Title & Issuer */}
                                    <h1 style={{ fontSize: '2rem', color: '#ffffff', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.25 }}>
                                          {certData.name}
                                    </h1>
                                    <div style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1.75rem' }}>
                                          Issued by <strong style={{ color: '#f1f5f9' }}>{certData.issued_by || 'Accredited Organization'}</strong>
                                    </div>

                                    {/* Key Details Metadata Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
                                          <div>
                                                <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                                                      Conferred Candidate
                                                </span>
                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                                                      {certData.candidate_name}
                                                </span>
                                          </div>
                                          <div>
                                                <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                                                      Date / Year
                                                </span>
                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                                                      {certData.date || 'Verified Active'}
                                                </span>
                                          </div>
                                          {certData.skills_learned && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                      <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
                                                            Skills Validated
                                                      </span>
                                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {certData.skills_learned.split(',').map((skill, sIdx) => (
                                                                  <span key={sIdx} style={{ fontSize: '0.78rem', background: 'rgba(225, 29, 72, 0.15)', color: '#fda4af', border: '1px solid rgba(225, 29, 72, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                                                                        {skill.trim()}
                                                                  </span>
                                                            ))}
                                                      </div>
                                                </div>
                                          )}
                                    </div>

                                    {/* Embedded Certificate Viewer */}
                                    {(certData.has_file || isCloudinary) ? (
                                          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', background: '#0b0f19', textAlign: 'center', marginBottom: '1.75rem', position: 'relative' }}>
                                                {isPdf ? (
                                                      <iframe
                                                            src={`${fileSrc}#toolbar=0`}
                                                            title="Certificate Document"
                                                            style={{ width: '100%', height: '620px', border: 'none' }}
                                                      />
                                                ) : (
                                                      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                            <img
                                                                  src={fileSrc}
                                                                  alt={certData.name}
                                                                  style={{ maxWidth: '100%', maxHeight: '680px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}
                                                            />
                                                      </div>
                                                )}
                                          </div>
                                    ) : (
                                          <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.12)', color: '#94a3b8', marginBottom: '1.75rem' }}>
                                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📄</span>
                                                Official digital accreditation record confirmed without raw paper scan.
                                          </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                          {certData.has_file && (
                                                <a
                                                      href={fileSrc}
                                                      download
                                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}
                                                >
                                                      📥 Download Certificate File
                                                </a>
                                          )}
                                          {certData.has_file && (
                                                <a
                                                      href={fileSrc}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}
                                                >
                                                      ↗️ Open in New Tab
                                                </a>
                                          )}
                                          {certData.link && (
                                                <a
                                                      href={certData.link.startsWith('http') ? certData.link : `https://${certData.link}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}
                                                >
                                                      🌐 Official Issuer Link
                                                </a>
                                          )}
                                    </div>
                              </div>
                        )}
                  </main>

                  <footer style={{ marginTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                        Authenticated by <strong style={{ color: '#e11d48' }}>CVNex</strong> • Build Smart. Score High. Get Hired.
                  </footer>
            </div>
      );
}

export default CertificateVerifier;

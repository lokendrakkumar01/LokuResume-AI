import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';
import { useToast } from '../context/ToastContext';
import '../styles/ATSAnalyzer.css';

function ATSAnalyzerModal({ resume, onClose }) {
      const [jdText, setJdText] = useState('');
      const [analyzing, setAnalyzing] = useState(false);
      const [result, setResult] = useState(null);
      const { showToast } = useToast();

      const handleAnalyze = async () => {
            if (!jdText.trim()) {
                  showToast('Please paste a job description to analyze', 'warning');
                  return;
            }

            setAnalyzing(true);
            try {
                  const response = await axios.post(`${config.API_BASE_URL}/ai/analyze-jd`, {
                        resume_summary: resume?.summary || '',
                        resume_skills: resume?.skills || [],
                        job_description: jdText
                  });
                  setResult(response.data);
                  showToast('ATS match analysis complete!', 'success');
            } catch (error) {
                  showToast(error.response?.data?.detail || 'Failed to analyze job description', 'error');
            } finally {
                  setAnalyzing(false);
            }
      };

      return (
            <div className="ats-modal-overlay" onClick={onClose}>
                  <div className="ats-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="ats-modal-header">
                              <div>
                                    <h2>🎯 ATS Job Matcher</h2>
                                    <p className="ats-subtitle">Paste target job post to check keyword alignment & ATS match score</p>
                              </div>
                              <button className="ats-close-btn" onClick={onClose}>×</button>
                        </div>

                        <div className="ats-modal-body">
                              <div className="ats-input-group">
                                    <label>Job Description / Requirements</label>
                                    <textarea
                                          value={jdText}
                                          onChange={(e) => setJdText(e.target.value)}
                                          rows={6}
                                          placeholder="Paste job posting duties, required skills, or tech stack here..."
                                    />
                                    <button
                                          onClick={handleAnalyze}
                                          className="btn btn-primary"
                                          disabled={analyzing}
                                          style={{ marginTop: '12px', width: '100%' }}
                                    >
                                          {analyzing ? 'Analyzing Keywords...' : '⚡ Analyze ATS Alignment'}
                                    </button>
                              </div>

                              {result && (
                                    <div className="ats-result-container fade-in">
                                          <div className="ats-score-badge-card">
                                                <div className="ats-score-number">{result.match_score}%</div>
                                                <div className="ats-score-label">Job Match Confidence</div>
                                          </div>

                                          <div className="ats-details-grid">
                                                <div className="ats-detail-box matching">
                                                      <h4>✅ Matched Keywords ({result.matching_keywords.length})</h4>
                                                      <div className="ats-pills">
                                                            {result.matching_keywords.length > 0 ? (
                                                                  result.matching_keywords.map((kw, i) => <span key={i} className="pill pill-green">{kw}</span>)
                                                            ) : <span className="text-muted">None matched</span>}
                                                      </div>
                                                </div>

                                                <div className="ats-detail-box missing">
                                                      <h4>❌ Missing Keywords ({result.missing_keywords.length})</h4>
                                                      <div className="ats-pills">
                                                            {result.missing_keywords.length > 0 ? (
                                                                  result.missing_keywords.map((kw, i) => <span key={i} className="pill pill-red">{kw}</span>)
                                                            ) : <span className="text-muted">None missing!</span>}
                                                      </div>
                                                </div>
                                          </div>

                                          {result.recommendations.length > 0 && (
                                                <div className="ats-recommendations">
                                                      <h4>💡 Recommendations</h4>
                                                      <ul>
                                                            {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                                                      </ul>
                                                </div>
                                          )}
                                    </div>
                              )}
                        </div>
                  </div>
            </div>
      );
}

export default ATSAnalyzerModal;

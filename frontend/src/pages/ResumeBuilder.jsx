import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ATSAnalyzerModal from '../components/ATSAnalyzerModal';
import ResumePreview from '../components/ResumePreview';
import ErrorBoundary from '../components/ErrorBoundary';
import axios from 'axios';
import config from '../config';
import '../styles/ResumeBuilder.css';
import '../styles/ResumeBuilderExtra.css';

const POPULAR_TECH_SKILLS = [
      'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'FastAPI',
      'Docker', 'AWS', 'PostgreSQL', 'MongoDB', 'Redis', 'Git', 'Next.js',
      'GraphQL', 'Tailwind CSS', 'CI/CD', 'REST APIs', 'Kubernetes'
];

const POPULAR_BUSINESS_SKILLS = [
      'Strategic Planning', 'P&L Management', 'Sales & Negotiations',
      'Team Leadership', 'Budgeting & Forecasting', 'Client Relationship (CRM)',
      'Operations Management', 'Market Analysis', 'Revenue Optimization',
      'Agile Project Management', 'Risk Management', 'Stakeholder Communication',
      'Public Speaking & Pitching', 'Cross-Functional Collaboration'
];

export const auditResumeDraft = (data) => {
      const isBiz = data?.track === 'business';
      const mistakes = [];
      const p = data?.personal_info || {};

      // 1. Contact / Personal info
      if (!p.name || p.name.trim().length < 2) {
            mistakes.push({
                  id: 'missing-name',
                  severity: 'critical',
                  step: 1,
                  titleEn: 'Missing Full Name',
                  titleHi: 'पूरा नाम नहीं भरा है',
                  descEn: 'A resume without your full name will be rejected immediately by ATS and HR screening.',
                  descHi: 'बिना पूरे नाम के रिज्यूमे को कोई भी कंपनी या एटीएस स्वीकार नहीं करेगा।',
                  speechHi: 'आपके रिज्यूमे में पूरा नाम गायब है। स्टेप 1 में जाकर अपना पूरा नाम दर्ज करें।',
                  speechEn: 'Your full name is missing. Please add your full name in Step 1.'
            });
      }
      if (!p.email || !p.email.includes('@')) {
            mistakes.push({
                  id: 'missing-email',
                  severity: 'critical',
                  step: 1,
                  titleEn: 'Missing Valid Email Address',
                  titleHi: 'ईमेल आईडी गायब या अमान्य है',
                  descEn: 'Recruiters cannot invite you for an interview without a verified email address.',
                  descHi: 'बिना वैध ईमेल आईडी के रिक्रूटर आपसे इंटरव्यू के लिए संपर्क नहीं कर पाएंगे।',
                  speechHi: 'आपकी ईमेल आईडी नहीं मिली। स्टेप 1 में सही ईमेल पता भरें।',
                  speechEn: 'A valid email address is missing. Please update it in Step 1.'
            });
      }
      if (!p.phone || p.phone.trim().length < 8) {
            mistakes.push({
                  id: 'missing-phone',
                  severity: 'critical',
                  step: 1,
                  titleEn: 'Missing Phone Number',
                  titleHi: 'मोबाइल नंबर दर्ज नहीं है',
                  descEn: 'Phone number is mandatory for recruiter screening calls and verification.',
                  descHi: 'एचआर टेलीफोनिक राउंड और इंटरव्यू कॉल के लिए फोन नंबर जरूरी है।',
                  speechHi: 'आपका फोन नंबर गायब है। स्टेप 1 में मोबाइल नंबर अवश्य जोड़ें।',
                  speechEn: 'Phone number is missing. Please add your contact number in Step 1.'
            });
      }
      if (!p.linkedin) {
            mistakes.push({
                  id: 'missing-linkedin',
                  severity: 'warning',
                  step: 1,
                  titleEn: 'Missing LinkedIn Profile URL',
                  titleHi: 'लिंक्डइन प्रोफाइल लिंक नहीं है',
                  descEn: 'Over 85% of recruiters verify candidates on LinkedIn before scheduling interviews.',
                  descHi: '85% से ज्यादा रिक्रूटर्स इंटरव्यू से पहले आपकी लिंक्डइन प्रोफाइल जांचते हैं।',
                  speechHi: 'लिंक्डइन प्रोफाइल लिंक गायब है। स्टेप 1 में अपना लिंक्डइन यूआरएल जोड़ें।',
                  speechEn: 'Your LinkedIn profile is missing. Adding it in Step 1 boosts credibility.'
            });
      }
      if (!isBiz && !p.github) {
            mistakes.push({
                  id: 'missing-github',
                  severity: 'warning',
                  step: 1,
                  titleEn: 'Tech Resume Missing GitHub Link',
                  titleHi: 'टेक रिज्यूमे में गिटहब लिंक नहीं है',
                  descEn: 'Software engineering recruiters expect to inspect code repositories on GitHub.',
                  descHi: 'सॉफ्टवेयर डेवलपर के लिए गिटहब पर कोड रिपोजिटरी दिखाना बहुत जरूरी है।',
                  speechHi: 'टेक रिज्यूमे में गिटहब लिंक नहीं मिला। स्टेप 1 में अपना गिटहब प्रोफाइल लिंक जोड़ें।',
                  speechEn: 'For technical resumes, a GitHub link is strongly expected in Step 1.'
            });
      }

      // 2. Summary
      const summaryWords = (data?.summary || '').trim().split(/\s+/).filter(Boolean).length;
      if (summaryWords < 20) {
            mistakes.push({
                  id: 'short-summary',
                  severity: 'critical',
                  step: 2,
                  titleEn: summaryWords === 0 ? 'Missing Professional Summary' : `Summary Too Short (${summaryWords} words, min 25 needed)`,
                  titleHi: summaryWords === 0 ? 'प्रोफेशनल समरी नहीं लिखी है' : `समरी बहुत छोटी है (${summaryWords} शब्द, कम से कम 25 चाहिए)`,
                  descEn: 'Recruiters spend 6 seconds scanning. A 40-80 word summary conveys your core value immediately.',
                  descHi: 'समरी के बिना रिज्यूमे अधूरा लगता है। स्टेप 2 में कम से कम 40 से 80 शब्दों की मजबूत समरी लिखें।',
                  speechHi: 'आपकी प्रोफेशनल समरी बहुत छोटी या खाली है। स्टेप 2 में 40 से 80 शब्दों की मजबूत समरी लिखें।',
                  speechEn: 'Your professional summary is too brief. Please write a 40 to 80 word summary in Step 2.'
            });
      }

      // 3. Education
      if (!data?.education || data.education.length === 0 || !data.education[0]?.degree) {
            mistakes.push({
                  id: 'missing-education',
                  severity: 'critical',
                  step: 3,
                  titleEn: 'No Education History Added',
                  titleHi: 'एजुकेशन डिटेल्स नहीं जोड़ी हैं',
                  descEn: 'Degrees and graduation credentials are required by enterprise ATS filters.',
                  descHi: 'अपनी डिग्री और कॉलेज की जानकारी स्टेप 3 में अवश्य जोड़ें।',
                  speechHi: 'स्टेप 3 में अपनी डिग्री और कॉलेज की जानकारी अवश्य जोड़ें।',
                  speechEn: 'Please add your degree and university details in Step 3.'
            });
      }

      // 4. Skills
      const skillCount = (data?.skills || []).length;
      if (skillCount < 5) {
            mistakes.push({
                  id: 'few-skills',
                  severity: 'critical',
                  step: 4,
                  titleEn: `Only ${skillCount} Skills Added (Minimum 5 required)`,
                  titleHi: `केवल ${skillCount} स्किल्स हैं (कम से कम 5 आवश्यक हैं)`,
                  descEn: 'ATS systems match job descriptions against your skills. Aim for 8-15 relevant skills.',
                  descHi: 'एटीएस सिस्टम जॉब डिस्क्रिप्शन से स्किल्स मैच करता है। कम से कम 8 से 12 स्किल्स जोड़ें।',
                  speechHi: `आपके रिज्यूमे में सिर्फ ${skillCount} स्किल्स हैं। स्टेप 4 में कम से कम 5 या 10 स्किल्स जोड़ें।`,
                  speechEn: `You have only ${skillCount} skills. Please add at least 5 to 10 relevant skills in Step 4.`
            });
      }

      // 5. Business References vs Tech Projects
      if (isBiz) {
            if (!data?.references || data.references.length === 0 || !data.references[0]?.name) {
                  mistakes.push({
                        id: 'missing-references',
                        severity: 'warning',
                        step: 5,
                        titleEn: 'No Professional References Added',
                        titleHi: 'कोई प्रोफेशनल रेफरेंस नहीं जोड़ा',
                        descEn: 'Executive and MBA resumes stand out when backed by corporate or academic references.',
                        descHi: 'बिजनेस और एग्जीक्यूटिव रिज्यूमे में रेफरेंस होने से विश्वसनीयता दोगुनी हो जाती है।',
                        speechHi: 'बिजनेस रिज्यूमे के लिए स्टेप 5 में कम से कम एक प्रोफेशनल रेफरेंस अवश्य जोड़ें।',
                        speechEn: 'For executive and business resumes, please add at least one professional reference in Step 5.'
                  });
            }
      } else {
            if (!data?.projects || data.projects.length === 0 || !data.projects[0]?.title) {
                  mistakes.push({
                        id: 'missing-projects',
                        severity: 'critical',
                        step: 5,
                        titleEn: 'No Software Projects Added',
                        titleHi: 'कोई प्रोजेक्ट नहीं जोड़ा है',
                        descEn: 'Technical hiring managers evaluate engineering capability through real projects.',
                        descHi: 'सॉफ्टवेयर डेवलपर्स के लिए कम से कम 2 लाइव प्रोजेक्ट्स दिखाना अत्यंत जरूरी है।',
                        speechHi: 'सॉफ्टवेयर डेवलपर के लिए प्रोजेक्ट्स सबसे अहम हैं। स्टेप 5 में अपने प्रोजेक्ट्स जोड़ें।',
                        speechEn: 'Technical resumes require at least one or two software projects. Add them in Step 5.'
                  });
            }
      }

      // 6. Experience & Metrics
      if (data?.experience && data.experience.length > 0) {
            let hasNumbers = false;
            data.experience.forEach(exp => {
                  if (/\d+|%|\$|₹|\+/.test(exp?.description || '')) {
                        hasNumbers = true;
                  }
            });
            if (!hasNumbers) {
                  mistakes.push({
                        id: 'no-metrics-experience',
                        severity: 'critical',
                        step: 6,
                        titleEn: 'Missing Quantifiable Numbers / % Metrics in Experience',
                        titleHi: 'एक्सपीरियंस में नंबर्स, रेवेन्यू या % आंकड़े नहीं हैं',
                        descEn: 'Fatal mistake! Recruiters reject generic duties. Use numbers (e.g., "Increased revenue by 35%", "Led team of 8", "Handled $2M P&L").',
                        descHi: 'सबसे बड़ी गलती! साधारण काम लिखने की जगह आंकड़े लिखें जैसे "35% ग्रोथ", "1000+ यूजर्स"।',
                        speechHi: 'वर्क एक्सपीरियंस में कोई आंकड़े या परसेंटेज नहीं हैं। बिना नंबर्स के रिक्रूटर रिज्यूमे रिजेक्ट कर देते हैं। स्टेप 6 में अपने परिणाम प्रतिशत में लिखें।',
                        speechEn: 'Your work experience lacks measurable numbers or percentages. Recruiters look for metrics like increased revenue or reduced latency. Add them in Step 6.'
                  });
            }
      }

      return mistakes;
};

function ResumeBuilder() {
      const { id } = useParams();
      const { getAuthHeader, studentTrack, setStudentTrack } = useAuth();
      const { showToast } = useToast();
      const navigate = useNavigate();

      const [currentStep, setCurrentStep] = useState(1);
      const [loading, setLoading] = useState(false);
      const [score, setScore] = useState(null);
      const [showPreview, setShowPreview] = useState(false);
      const [showATSModal, setShowATSModal] = useState(false);
      const [showMistakesModal, setShowMistakesModal] = useState(false);
      const [isAuditingVoice, setIsAuditingVoice] = useState(false);
      const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
      const [uploadingPhoto, setUploadingPhoto] = useState(false);
      const [uploadingCertIndex, setUploadingCertIndex] = useState(null);
      const [uploadingAchIndex, setUploadingAchIndex] = useState(null);
      const isInitialMount = useRef(true);

      // Inline skill & hobby input state
      const [skillInput, setSkillInput] = useState('');
      const [hobbyInput, setHobbyInput] = useState('');

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
                  track: studentTrack || 'tech',
                  personal_info: {
                        name: '',
                        email: '',
                        phone: '',
                        location: '',
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
                  references: [],
                  hobbies: [],
                  certifications: [],
                  achievements: [],
                  languages: [],
                  interests: [],
                  custom_sections: [],
                  template_style: (studentTrack === 'business') ? 'business_executive' : 'modern',
                  pdf_preferences: {
                        background_color: '#ffffff',
                        accent_color: '#111827'
                  }
            };
      });

      useEffect(() => {
            if (id) {
                  fetchResume();
            }
      }, [id]);

      // 1.5s Debounced Auto-save to MongoDB (or localStorage for drafts)
      useEffect(() => {
            if (isInitialMount.current) {
                  isInitialMount.current = false;
                  return;
            }

            if (!formData.personal_info?.name || !formData.personal_info?.email) {
                  if (!id) {
                        localStorage.setItem('resume_draft', JSON.stringify(formData));
                  }
                  return;
            }

            if (!id) {
                  localStorage.setItem('resume_draft', JSON.stringify(formData));
                  return;
            }

            setSaveStatus('saving');
            const timer = setTimeout(async () => {
                  try {
                        const response = await axios.put(`${config.API_BASE_URL}/resumes/${id}`, formData, {
                              headers: getAuthHeader()
                        });
                        setScore(response.data.score);
                        setSaveStatus('saved');
                  } catch (err) {
                        console.error('Autosave error:', err);
                        setSaveStatus('error');
                  }
            }, 1500);

            return () => clearTimeout(timer);
      }, [formData, id]);

      // Auto-scroll active stepper pill into view horizontally on step change (mobile friendly)
      useEffect(() => {
            const stepEl = document.getElementById(`step-badge-${currentStep}`);
            if (stepEl) {
                  stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
      }, [currentStep]);

      // Calculate Live ATS Readiness Score
      const liveATSScore = useMemo(() => {
            let pts = 0;
            const p = formData.personal_info || {};
            if (p.name && p.email) pts += 15;
            if (p.phone) pts += 5;
            if (p.location) pts += 5;
            if (p.headline) pts += 10;
            if (p.linkedin || p.github || p.portfolio) pts += 5;
            if (formData.summary && formData.summary.trim().split(/\s+/).filter(Boolean).length >= 20) pts += 15;
            if (formData.education && formData.education.length > 0 && formData.education[0].degree) pts += 10;
            if (formData.skills && formData.skills.length >= 4) pts += 15;
            if (formData.experience && formData.experience.length > 0 && formData.experience[0].company) pts += 5;
            if (formData.certifications && formData.certifications.length > 0 && formData.certifications[0].name) pts += 5;
            if (formData.achievements && formData.achievements.length > 0 && formData.achievements[0].title) pts += 5;

            if (formData.track === 'business') {
                  if (formData.references && formData.references.length > 0 && formData.references[0].name) pts += 10;
                  if (formData.languages && formData.languages.length > 0) pts += 5;
                  if (formData.hobbies && formData.hobbies.length > 0) pts += 5;
            } else {
                  if (formData.projects && formData.projects.length > 0 && formData.projects[0].title) pts += 10;
                  if (formData.coding_profiles && formData.coding_profiles.length > 0) pts += 5;
            }
            return Math.min(100, pts);
      }, [formData]);

      // Real-time resume mistakes detection
      const detectedMistakes = useMemo(() => {
            return auditResumeDraft(formData);
      }, [formData]);

      const speakAuditReport = (lang = 'hi') => {
            if (!('speechSynthesis' in window)) {
                  showToast('Voice playback is not supported on this browser.', 'warning');
                  return;
            }
            window.speechSynthesis.cancel();
            const mistakes = detectedMistakes;

            let textToSpeak = '';
            if (mistakes.length === 0) {
                  textToSpeak = lang === 'hi'
                        ? 'शानदार! आपके रिज्यूमे में कोई गंभीर गलती नहीं मिली। आपका रिज्यूमे पूरी तरह एटीएस रेडी है!'
                        : 'Great job! No critical mistakes found in your resume. It is fully ATS ready!';
            } else {
                  if (lang === 'hi') {
                        textToSpeak = `नमस्ते! हमने आपके रिज्यूमे की जाँच की। आपके रिज्यूमे में ${mistakes.length} गलतियाँ मिली हैं। `;
                        mistakes.slice(0, 3).forEach((m, idx) => {
                              textToSpeak += `गलती नंबर ${idx + 1}: ${m.speechHi} `;
                        });
                        if (mistakes.length > 3) {
                              textToSpeak += `बाकी गलतियाँ स्क्रीन पर दी गई हैं, उन्हें भी स्टेप बाय स्टेप ठीक करें।`;
                        }
                  } else {
                        textToSpeak = `Hello! We audited your resume and found ${mistakes.length} issues to correct. `;
                        mistakes.slice(0, 3).forEach((m, idx) => {
                              textToSpeak += `Mistake number ${idx + 1}: ${m.speechEn} `;
                        });
                        if (mistakes.length > 3) {
                              textToSpeak += `Please review the remaining issues on your screen.`;
                        }
                  }
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = 0.95;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            if (lang === 'hi') {
                  const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('india'));
                  if (hiVoice) utterance.voice = hiVoice;
            } else {
                  const enVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Google') || v.name.includes('Natural')));
                  if (enVoice) utterance.voice = enVoice;
            }

            setIsAuditingVoice(true);
            utterance.onend = () => setIsAuditingVoice(false);
            utterance.onerror = () => setIsAuditingVoice(false);
            window.speechSynthesis.speak(utterance);
      };

      const stopAuditVoice = () => {
            if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
            }
            setIsAuditingVoice(false);
      };

      const handleAuditResume = () => {
            setShowMistakesModal(true);
            speakAuditReport('hi');
      };

      useEffect(() => {
            const handleResumeAuditTrigger = () => {
                  setShowMistakesModal(true);
                  speakAuditReport('hi');
            };
            window.addEventListener('trigger-resume-audit', handleResumeAuditTrigger);
            return () => {
                  window.removeEventListener('trigger-resume-audit', handleResumeAuditTrigger);
            };
      }, [detectedMistakes]);

      const fetchResume = async () => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });

                  const data = response.data;
                  if (!data.track) data.track = studentTrack || 'tech';
                  if (!data.references) data.references = [];
                  if (!data.hobbies) data.hobbies = [];
                  if (data.certifications && data.certifications.length > 0) {
                        data.certifications = data.certifications.map(cert => {
                              if (typeof cert === 'string') {
                                    return { name: cert, file_data: '', file_url: '', issued_by: '', date: '', link: '', skills_learned: '' };
                              }
                              return {
                                    name: cert.name || '',
                                    file_data: cert.file_data || '',
                                    file_url: cert.file_url || '',
                                    issued_by: cert.issued_by || '',
                                    date: cert.date || '',
                                    link: cert.link || '',
                                    skills_learned: cert.skills_learned || ''
                              };
                        });
                  }

                  if (data.achievements && data.achievements.length > 0) {
                        data.achievements = data.achievements.map(ach => {
                              if (typeof ach === 'string') {
                                    return { title: ach, description: '', date: '', link: '' };
                              }
                              return {
                                    title: ach.title || '',
                                    description: ach.description || '',
                                    date: ach.date || '',
                                    link: ach.link || ''
                              };
                        });
                  }

                  if (!data.pdf_preferences) {
                        data.pdf_preferences = {
                              background_color: '#ffffff',
                              accent_color: '#111827'
                        };
                  }
                  if (!data.pdf_preferences.accent_color) {
                        data.pdf_preferences.accent_color = '#111827';
                  }
                  if (!data.template_style) {
                        data.template_style = data.track === 'business' ? 'business_executive' : 'modern';
                  }
                  if (!data.languages) data.languages = [];
                  if (!data.interests) data.interests = [];
                  if (!data.custom_sections) data.custom_sections = [];

                  setFormData(data);
                  setScore(data.score);
            } catch (error) {
                  showToast('Failed to load resume details', 'error');
            }
      };

      const handleUpdatePreferences = async (newPrefs) => {
            const nextTemplate = newPrefs.template_style || formData.template_style || 'modern';
            const nextColor = newPrefs.accent_color || formData.pdf_preferences?.accent_color || '#111827';
            const nextIncludePhoto = newPrefs.include_photo !== undefined
                  ? newPrefs.include_photo
                  : (formData.pdf_preferences?.include_photo !== undefined ? formData.pdf_preferences.include_photo : true);

            const updated = {
                  ...formData,
                  template_style: nextTemplate,
                  pdf_preferences: {
                        ...(formData.pdf_preferences || {}),
                        background_color: '#ffffff',
                        accent_color: nextColor,
                        include_photo: nextIncludePhoto
                  }
            };
            setFormData(updated);

            if (id) {
                  try {
                        await axios.put(`${config.API_BASE_URL}/resumes/${id}/preferences`, {
                              template_style: nextTemplate,
                              accent_color: nextColor,
                              include_photo: nextIncludePhoto
                        }, { headers: getAuthHeader() });
                  } catch (e) {
                        console.warn('Sync preferences error:', e);
                  }
            }
      };

      const handleSave = async () => {
            if (!formData.personal_info?.name || !formData.personal_info?.email) {
                  showToast('Please enter your Name and Email in Step 1 before saving', 'warning');
                  setCurrentStep(1);
                  return;
            }

            setLoading(true);
            setSaveStatus('saving');
            try {
                  if (id) {
                        const response = await axios.put(`${config.API_BASE_URL}/resumes/${id}`, formData, {
                              headers: getAuthHeader()
                        });
                        setScore(response.data.score);
                        setSaveStatus('saved');
                        showToast('Resume updated successfully!', 'success');
                  } else {
                        const response = await axios.post(`${config.API_BASE_URL}/resumes`, formData, {
                              headers: getAuthHeader()
                        });
                        const newId = response.data.id;
                        setScore(response.data.score);
                        setSaveStatus('saved');
                        showToast('Resume saved successfully!', 'success');
                        localStorage.removeItem('resume_draft');

                        if (newId) {
                              navigate(`/resume/edit/${newId}`);
                        }
                  }
            } catch (error) {
                  console.error('Save Resume Error:', error);
                  setSaveStatus('error');
                  showToast(error.response?.data?.detail || 'Failed to save resume', 'error');
            } finally {
                  setLoading(false);
            }
      };

      // Download PDF Handler with 50% Score Enforcement & Real-time Color Sync
      const handleDownloadPDF = async (overrides = {}) => {
            const currentScore = score !== null ? score : liveATSScore;
            if (currentScore < 50) {
                  showToast(`⚠️ Resume completeness is ${Math.round(currentScore)}%. Complete at least 50% to download PDF!`, 'warning');
                  return;
            }

            const targetTemplate = overrides.template_style || formData.template_style || 'modern';
            const targetColor = overrides.accent_color || formData.pdf_preferences?.accent_color || '#111827';
            const targetIncludePhoto = overrides.include_photo !== undefined
                  ? overrides.include_photo
                  : (formData.pdf_preferences?.include_photo !== undefined ? formData.pdf_preferences.include_photo : true);

            let resumeId = id;
            if (!resumeId) {
                  if (!formData.personal_info?.name || !formData.personal_info?.email) {
                        showToast('Please enter your Name and Email in Step 1 before downloading', 'warning');
                        setCurrentStep(1);
                        return;
                  }
                  showToast('Saving resume before downloading PDF...', 'info');
                  try {
                        const payload = {
                              ...formData,
                              template_style: targetTemplate,
                              pdf_preferences: {
                                    ...(formData.pdf_preferences || {}),
                                    accent_color: targetColor,
                                    include_photo: targetIncludePhoto
                              }
                        };
                        const saveRes = await axios.post(`${config.API_BASE_URL}/resumes`, payload, {
                              headers: getAuthHeader()
                        });
                        resumeId = saveRes.data.id;
                        setFormData(saveRes.data);
                        setScore(saveRes.data.score);
                        localStorage.removeItem('resume_draft');
                  } catch (err) {
                        showToast('Failed to save resume for PDF export', 'error');
                        return;
                  }
            } else {
                  // Save latest preferences and changes before downloading
                  try {
                        const updateRes = await axios.put(`${config.API_BASE_URL}/resumes/${resumeId}`, {
                              ...formData,
                              template_style: targetTemplate,
                              pdf_preferences: {
                                    ...(formData.pdf_preferences || {}),
                                    accent_color: targetColor,
                                    include_photo: targetIncludePhoto
                              }
                        }, {
                              headers: getAuthHeader()
                        });
                        setScore(updateRes.data.score);
                        setSaveStatus('saved');
                  } catch (err) {
                        console.error('Auto-save before download warning:', err);
                  }
            }

            try {
                  showToast('Generating official PDF...', 'info');
                  const queryParams = new URLSearchParams({
                        accent_color: targetColor,
                        template_style: targetTemplate,
                        include_photo: targetIncludePhoto
                  }).toString();

                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${resumeId}/download?${queryParams}`, {
                        headers: getAuthHeader(),
                        responseType: 'blob'
                  });

                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  const safeName = (formData.personal_info?.name || 'Resume').replace(/\s+/g, '_');
                  link.setAttribute('download', `${safeName}_Resume.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  showToast('🎉 PDF downloaded successfully!', 'success');
            } catch (error) {
                  console.error('PDF Download Error:', error);
                  showToast('Failed to generate PDF. Ensure resume score is at least 50%', 'error');
            }
      };

      // 1-Click Auto-fill Sample Data
      const handleAutoFill = () => {
            if (formData.track === 'business') {
                  setFormData({
                        track: 'business',
                        personal_info: {
                              name: 'Michael Scott',
                              email: 'michael.scott@dundermifflin.com',
                              phone: '+1 (555) 019-2834',
                              location: 'Scranton, Pennsylvania',
                              linkedin: 'https://linkedin.com/in/michaelscott-regional',
                              github: '',
                              leetcode: '',
                              problem_solving: '',
                              portfolio: 'https://dundermifflin.com/scranton',
                              headline: 'Regional Manager | Sales & Business Operations',
                              profile_photo: formData.personal_info?.profile_photo || ''
                        },
                        coding_profiles: [],
                        summary: 'Dynamic, result-oriented Regional Manager with 12+ years of leadership across branch operations, client acquisitions, and corporate sales strategy. Proven track record boosting branch profitability by 140%, fostering high-morale sales teams, and establishing long-term enterprise client partnerships.',
                        education: [
                              { degree: 'BBA | Marketing & Business Administration (2008-2012)', college: 'Scranton Business Institute', year: '2008 - 2012', grade: 'GPA: 3.9 / 4.0 (Dean\'s List)' },
                              { degree: 'Executive Management Certificate (2015)', college: 'Wharton Executive Education', year: '2015', grade: 'Completed with Honors' }
                        ],
                        skills: [
                              'Regional Branch Management', 'Client Acquisition & Retention', 'P&L Optimization',
                              'Strategic Sales & Negotiations', 'Cross-Functional Leadership', 'Budgeting & Forecasting',
                              'Crisis Management', 'Public Speaking & Pitching', 'Contract Negotiation', 'Agile Team Building'
                        ],
                        projects: [],
                        experience: [
                              {
                                    company: 'Dunder Mifflin Paper Company',
                                    role: 'Regional Manager',
                                    duration: '2013 - Present',
                                    description: 'Spearheaded northeast branch operations delivering 140% of corporate revenue target for 4 consecutive years. Mentored a 15-person sales and distribution team achieving the lowest staff turnover rate in corporate history. Personally negotiated and closed top 5 municipal supplier contracts generating $1.8M ARR.'
                              },
                              {
                                    company: 'Dunder Mifflin Paper Company',
                                    role: 'Senior Sales Executive',
                                    duration: '2009 - 2013',
                                    description: 'Awarded Top Salesperson of the Year twice consecutively. Consistently surpassed quarterly sales quotas by 35% through relationship-driven enterprise client acquisition.'
                              }
                        ],
                        references: [
                              {
                                    name: 'David Wallace',
                                    company: 'Dunder Mifflin Corporate HQ',
                                    role: 'Chief Financial Officer',
                                    phone: '+1 (555) 302-8811',
                                    email: 'dwallace@dundermifflin.com'
                              },
                              {
                                    name: 'Jan Levinson',
                                    company: 'Corporate Operations',
                                    role: 'VP of Regional Sales',
                                    phone: '+1 (555) 302-9900',
                                    email: 'jlevinson@corporate.com'
                              }
                        ],
                        hobbies: [
                              'Improvisational Comedy',
                              'Ice Hockey Coaching',
                              'Screenwriting',
                              'Community Youth Mentorship'
                        ],
                        languages: [
                              { language: 'English', proficiency: 'Native' },
                              { language: 'Spanish', proficiency: 'Professional' }
                        ],
                        certifications: [
                              {
                                    name: 'Certified Sales Executive (CSE)',
                                    issued_by: 'SMEI International',
                                    date: '2020',
                                    link: 'https://smei.org/verify/cse-9921',
                                    skills_learned: 'Enterprise Sales, Client Relationship Management',
                                    file_data: '',
                                    file_url: ''
                              },
                              {
                                    name: 'Advanced Executive Leadership',
                                    issued_by: 'Harvard Division of Continuing Education',
                                    date: '2022',
                                    link: 'https://professional.dce.harvard.edu/verify/lead',
                                    skills_learned: 'P&L Strategy, Organizational Culture',
                                    file_data: '',
                                    file_url: ''
                              }
                        ],
                        achievements: [
                              {
                                    title: 'Best Branch Performance Award (6 Consecutive Years)',
                                    description: 'Awarded top performing branch across 12 northeastern states for outstanding customer retention and profit margins.',
                                    date: '2024',
                                    link: 'https://linkedin.com/posts/dunder-mifflin-award'
                              },
                              {
                                    title: 'Keynote Speaker - Scranton Chamber of Commerce Annual Gala',
                                    description: 'Delivered keynote address on client-first sales methodologies and entrepreneurial leadership to 400+ attendees.',
                                    date: '2023',
                                    link: ''
                              }
                        ],
                        template_style: 'business_executive',
                        pdf_preferences: { background_color: '#ffffff', accent_color: '#111827' }
                  });
                  showToast('Loaded Michael Scott Executive business sample!', 'success');
                  return;
            }

            setFormData({
                  track: 'tech',
                  personal_info: {
                        name: 'Alex Morgan',
                        email: 'alex.morgan@example.com',
                        phone: '+1 (555) 234-5678',
                        location: 'San Francisco, CA',
                        linkedin: 'https://linkedin.com/in/alexmorgan',
                        github: 'https://github.com/alexmorgan',
                        leetcode: 'https://leetcode.com/alexmorgan',
                        problem_solving: 'https://leetcode.com/alexmorgan',
                        portfolio: 'https://alexmorgan.dev',
                        headline: 'Full-Stack Developer | C, Java, React, Node.js',
                        profile_photo: formData.personal_info?.profile_photo || ''
                  },
                  coding_profiles: [
                        { platform: 'LeetCode', link: 'https://leetcode.com/alexmorgan', headline: 'Knight Rank (2150 Rating) | 650+ Solved' },
                        { platform: 'GitHub', link: 'https://github.com/alexmorgan', headline: '1,200+ Contributions in 2025' }
                  ],
                  summary: 'Accomplished Full-Stack Developer with strong foundations in data structures, distributed systems, and responsive web applications. Demonstrated track record building high-impact full-stack software and optimizing system workflows.',
                  education: [
                        { degree: 'B.Tech | Computer Science Engineering (2024-2028)', college: 'Shri Ramswaroop Memorial University', year: '2024 - 2028', grade: 'GPA: 8.8 / 10' },
                        { degree: 'Class XII (2024)', college: 'Gandhi Smarak Inter College Etah', year: '2024', grade: 'Percentage: 74' }
                  ],
                  skills: ['HTML/CSS', 'React.js', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript', 'Java', 'C', 'Deep Learning', 'REST APIs', 'Git', 'Collaboration', 'Problem-Solving'],
                  projects: [
                        {
                              title: 'ZUNO',
                              technologies: 'HTML/CSS, React.js, Node.js, MongoDB, JavaScript, Express.js, Mongoose',
                              description: 'ZUNO is a social media web application where users can share posts and communicate through personal chat and group chat.',
                              repository_url: 'https://github.com/alexmorgan/zuno',
                              live_demo_url: 'https://zuno-app.demo.com',
                              date: '2025'
                        },
                        {
                              title: 'Habit Tracker',
                              technologies: 'HTML/CSS, React.js, Node.js, MongoDB, JavaScript, Express.js, GitHub',
                              description: 'Developed a habit tracking web application to help users create, manage, and track their daily habits and build consistent routines.',
                              repository_url: 'https://github.com/alexmorgan/habit-tracker',
                              live_demo_url: 'https://habit-tracker.demo.com',
                              date: '2026'
                        }
                  ],
                  experience: [
                        {
                              company: 'Coding Block',
                              role: 'MERN Stack and DSA Intern',
                              duration: 'Jun 2026 - Jul 2026',
                              description: 'Developed web applications using MERN stack and strengthened DSA skills through problem solving. Worked with React, Node.js, Express.js, APIs, GitHub and modern web development practices.'
                        }
                  ],
                  references: [],
                  hobbies: [],
                  languages: [],
                  certifications: [
                        {
                              name: 'Prompt Engineering Mastery',
                              issued_by: 'Sunstone School of Technology',
                              date: 'May 2026',
                              link: 'https://coursera.org/verify/prompt-eng-mastery',
                              skills_learned: 'Ethical Hacking, Prompt Optimization',
                              file_data: '',
                              file_url: ''
                        },
                        {
                              name: 'Cyber Security Associate Certification Programme',
                              issued_by: 'Reliance Foundation Skilling Academy through Skill India Digital Hub',
                              date: 'August 2025 - October 2025',
                              link: 'https://skillindia.gov.in/verify/cyber-sec',
                              skills_learned: 'Ethical Hacking, Network Security',
                              file_data: '',
                              file_url: ''
                        },
                        {
                              name: 'JAVA PROGRAMMING',
                              issued_by: 'NPTEL',
                              date: 'July 2025 - December 2025',
                              link: 'https://nptel.ac.in/verify/java-prog',
                              skills_learned: 'Java, OOP, Collections',
                              file_data: '',
                              file_url: ''
                        }
                  ],
                  achievements: [
                        {
                              title: "Organised 'Jashn-e-Azadi' event at SRMU campus",
                              description: 'Organised and coordinated the Jashn-e-Azadi event at SRMU Campus, managing patriotic activities and coordinating participation of 150+ students. This experience strengthened leadership and teamwork.',
                              date: '2025',
                              link: 'https://linkedin.com/posts/jashn-e-azadi'
                        },
                        {
                              title: 'Adobe University Hackathon',
                              description: 'Participated in the Adobe University Hackathon 2026. Applied technical knowledge and collaborated in a competitive environment for creative problem-solving.',
                              date: '2026',
                              link: 'https://adobe-hackathon.example.com'
                        }
                  ],
                  template_style: formData.template_style || 'modern',
                  pdf_preferences: formData.pdf_preferences || { background_color: '#ffffff', accent_color: '#e11d48' }
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

      const handlePhotoUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                  showToast('Please select a valid image file (PNG, JPG, WEBP)', 'warning');
                  return;
            }
            if (file.size > 5 * 1024 * 1024) {
                  showToast('Photo size should be less than 5MB', 'warning');
                  return;
            }

            try {
                  setUploadingPhoto(true);
                  showToast('Uploading photo to Cloud CDN...', 'info');
                  const uploadData = new FormData();
                  uploadData.append('file', file);
                  const res = await axios.post(`${config.API_BASE_URL}/upload/?folder_type=photos`, uploadData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              ...getAuthHeader()
                        }
                  });
                  if (res.data && res.data.url) {
                        const photoUrl = res.data.url;
                        const updated = {
                              ...formData,
                              personal_info: { ...formData.personal_info, profile_photo: photoUrl },
                              pdf_preferences: {
                                    ...(formData.pdf_preferences || {}),
                                    include_photo: true
                              }
                        };
                        setFormData(updated);
                        showToast('Profile photo saved to Cloud CDN and enabled!', 'success');
                  } else {
                        throw new Error('No image URL returned from cloud');
                  }
            } catch (err) {
                  console.error('Photo upload error:', err);
                  // Local fallback if offline or network glitch
                  const reader = new FileReader();
                  reader.onloadend = () => {
                        const updated = {
                              ...formData,
                              personal_info: { ...formData.personal_info, profile_photo: reader.result },
                              pdf_preferences: {
                                    ...(formData.pdf_preferences || {}),
                                    include_photo: true
                              }
                        };
                        setFormData(updated);
                        showToast('Photo saved locally (fallback)', 'warning');
                  };
                  reader.readAsDataURL(file);
            } finally {
                  setUploadingPhoto(false);
            }
      };

      const handleRemovePhoto = () => {
            setFormData({
                  ...formData,
                  personal_info: { ...formData.personal_info, profile_photo: '' }
            });
            showToast('Profile photo removed', 'info');
      };

      const handleTogglePhoto = (included) => {
            handleUpdatePreferences({ include_photo: included });
            showToast(included ? 'Photo will appear on your resume & PDF' : 'Photo will be omitted from your resume & PDF', 'info');
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
                  projects: [...(formData.projects || []), { title: '', technologies: '', description: '', repository_url: '', live_demo_url: '', date: '' }]
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
                  certifications: [...(formData.certifications || []), { name: '', file_data: '', file_url: '', issued_by: '', date: '', link: '', skills_learned: '' }]
            });
      };
      const updateCertification = (index, field, value) => {
            const newCerts = [...(formData.certifications || [])];
            if (newCerts[index]) {
                  newCerts[index] = { ...newCerts[index], [field]: value };
                  setFormData({ ...formData, certifications: newCerts });
            }
      };
      const handleCertificateUpload = async (index, e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                  showToast('Certificate file should be under 10MB', 'warning');
                  return;
            }

            try {
                  setUploadingCertIndex(index);
                  showToast(`Uploading ${file.name} to Cloud CDN...`, 'info');
                  const uploadData = new FormData();
                  uploadData.append('file', file);
                  const res = await axios.post(`${config.API_BASE_URL}/upload/?folder_type=certificates`, uploadData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              ...getAuthHeader()
                        }
                  });
                  if (res.data && res.data.url) {
                        updateCertification(index, 'file_url', res.data.url);
                        updateCertification(index, 'file_name', file.name);
                        showToast(`Uploaded ${file.name} to Cloud CDN!`, 'success');
                  } else {
                        throw new Error('No secure URL returned from cloud');
                  }
            } catch (err) {
                  console.error('Certificate cloud upload error:', err);
                  // Local fallback
                  const reader = new FileReader();
                  reader.onloadend = () => {
                        updateCertification(index, 'file_data', reader.result);
                        updateCertification(index, 'file_url', file.name);
                        showToast(`Attached ${file.name} (local fallback)`, 'warning');
                  };
                  reader.readAsDataURL(file);
            } finally {
                  setUploadingCertIndex(null);
            }
      };
      const removeCertification = (index) => {
            setFormData({ ...formData, certifications: (formData.certifications || []).filter((_, i) => i !== index) });
      };

      // Achievements handlers
      const addAchievement = () => {
            setFormData({
                  ...formData,
                  achievements: [...(formData.achievements || []), { title: '', description: '', date: '', link: '', file_url: '', file_name: '' }]
            });
      };
      const updateAchievement = (index, field, value) => {
            const newAchievements = [...(formData.achievements || [])];
            if (newAchievements[index]) {
                  newAchievements[index] = { ...newAchievements[index], [field]: value };
                  setFormData({ ...formData, achievements: newAchievements });
            }
      };
      const handleAchievementProofUpload = async (index, e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                  showToast('Proof file should be under 10MB', 'warning');
                  return;
            }

            try {
                  setUploadingAchIndex(index);
                  showToast(`Uploading ${file.name} to Cloud CDN...`, 'info');
                  const uploadData = new FormData();
                  uploadData.append('file', file);
                  const res = await axios.post(`${config.API_BASE_URL}/upload/?folder_type=achievements`, uploadData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              ...getAuthHeader()
                        }
                  });
                  if (res.data && res.data.url) {
                        const newAchievements = [...(formData.achievements || [])];
                        newAchievements[index] = {
                              ...newAchievements[index],
                              file_url: res.data.url,
                              file_name: file.name,
                              link: newAchievements[index].link || res.data.url
                        };
                        setFormData({ ...formData, achievements: newAchievements });
                        showToast(`Proof uploaded & attached to achievement!`, 'success');
                  } else {
                        throw new Error('No secure URL returned from cloud');
                  }
            } catch (err) {
                  console.error('Achievement upload error:', err);
                  showToast('Cloud upload failed. Please try again or paste a link.', 'warning');
            } finally {
                  setUploadingAchIndex(null);
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

      // References handlers
      const addReference = () => {
            setFormData({
                  ...formData,
                  references: [...(formData.references || []), { name: '', company: '', role: '', phone: '', email: '' }]
            });
      };
      const updateReference = (index, field, value) => {
            const newRefs = [...(formData.references || [])];
            if (newRefs[index]) {
                  newRefs[index] = { ...newRefs[index], [field]: value };
                  setFormData({ ...formData, references: newRefs });
            }
      };
      const removeReference = (index) => {
            setFormData({ ...formData, references: (formData.references || []).filter((_, i) => i !== index) });
      };

      // Languages handlers
      const addLanguage = () => {
            setFormData({
                  ...formData,
                  languages: [...(formData.languages || []), { language: '', proficiency: 'Fluent' }]
            });
      };
      const updateLanguage = (index, field, value) => {
            const newLangs = [...(formData.languages || [])];
            if (newLangs[index]) {
                  newLangs[index] = { ...newLangs[index], [field]: value };
                  setFormData({ ...formData, languages: newLangs });
            }
      };
      const removeLanguage = (index) => {
            setFormData({ ...formData, languages: (formData.languages || []).filter((_, i) => i !== index) });
      };

      // Hobbies handlers
      const handleAddHobby = (h) => {
            const toAdd = (h || hobbyInput).trim();
            if (!toAdd) return;
            if (!(formData.hobbies || []).includes(toAdd)) {
                  setFormData({ ...formData, hobbies: [...(formData.hobbies || []), toAdd] });
            }
            setHobbyInput('');
      };
      const handleRemoveHobby = (h) => {
            setFormData({ ...formData, hobbies: (formData.hobbies || []).filter(item => item !== h) });
      };

      const isBusiness = formData.track === 'business';

      const stepsList = isBusiness ? [
            { num: 1, label: '👤 Personal' },
            { num: 2, label: '📝 Summary' },
            { num: 3, label: '🎓 Education' },
            { num: 4, label: '💼 Skills' },
            { num: 5, label: '🤝 References' },
            { num: 6, label: '🏢 Experience' },
            { num: 7, label: '📜 Certs' },
            { num: 8, label: '🏆 Awards' },
            { num: 9, label: '🌐 Lang & Hobbies' },
            { num: 10, label: '👀 Review' },
      ] : [
            { num: 1, label: '👤 Personal' },
            { num: 2, label: '📝 Summary' },
            { num: 3, label: '🎓 Education' },
            { num: 4, label: '💻 Skills' },
            { num: 5, label: '🚀 Projects' },
            { num: 6, label: '💻 Experience' },
            { num: 7, label: '📜 Certs' },
            { num: 8, label: '🏆 Awards' },
            { num: 9, label: '👨‍💻 Profiles' },
            { num: 10, label: '👀 Review' },
      ];

      const colorPresets = [
            { name: 'Black', color: '#111827' },
            { name: 'Blue', color: '#1e40af' },
            { name: 'Green', color: '#059669' },
            { name: 'Purple', color: '#7c3aed' },
            { name: 'Red', color: '#dc2626' }
      ];

      return (
            <div className="resume-builder">
                  {/* Stream Track Switcher Banner */}
                  <div className="stream-track-banner">
                        <div className="stream-track-info">
                              <span className="track-badge-icon">{isBusiness ? '💼' : '💻'}</span>
                              <div>
                                    <div className="track-badge-title">
                                          <strong>{isBusiness ? 'Business & Executive Track' : 'Tech & Developer Track'}</strong>
                                          <span className="track-pill-status">Active Stream</span>
                                    </div>
                                    <p className="track-badge-sub">
                                          {isBusiness
                                                ? 'Optimized for Sales, Management, MBA, References, Languages & 2-Column Executive Layouts'
                                                : 'Optimized for Software Developers, LeetCode, GitHub, Code Projects & Technical Stacks'}
                                    </p>
                              </div>
                        </div>
                        <div className="stream-track-toggle-btns">
                              <button
                                    type="button"
                                    className={`track-switch-btn ${!isBusiness ? 'active' : ''}`}
                                    onClick={() => {
                                          setStudentTrack && setStudentTrack('tech');
                                          setFormData(prev => ({ ...prev, track: 'tech' }));
                                    }}
                              >
                                    💻 Tech Track
                              </button>
                              <button
                                    type="button"
                                    className={`track-switch-btn ${isBusiness ? 'active' : ''}`}
                                    onClick={() => {
                                          setStudentTrack && setStudentTrack('business');
                                          setFormData(prev => ({
                                                ...prev,
                                                track: 'business',
                                                template_style: prev.template_style === 'modern' ? 'business_executive' : prev.template_style
                                          }));
                                    }}
                              >
                                    💼 Business Track
                              </button>
                        </div>
                  </div>

                  {/* Top Builder Bar */}
                  <div className="builder-header">
                        <div className="header-left-col">
                              <div className="title-row">
                                    <h1>{id ? '✏️ Edit Resume' : '✨ Create Resume'}</h1>
                                    <span className="live-score-pill" title="Real-time estimated ATS score">
                                          🎯 ATS Ready: <strong>{liveATSScore}%</strong>
                                    </span>
                                    <span
                                          className={`mistakes-pill-indicator ${detectedMistakes.length > 0 ? 'has-mistakes' : 'all-clean'}`}
                                          onClick={handleAuditResume}
                                          title="Click to audit resume mistakes with AI voice"
                                          style={{ cursor: 'pointer' }}
                                    >
                                          {detectedMistakes.length > 0 ? `⚠️ ${detectedMistakes.length} Mistakes` : '✅ 0 Mistakes'}
                                    </span>
                                    {saveStatus === 'saving' && (
                                          <span className="autosave-badge saving" title="Autosaving changes...">
                                                ⏳ Saving...
                                          </span>
                                    )}
                                    {saveStatus === 'saved' && (
                                          <span className="autosave-badge saved" title="All changes saved to cloud">
                                                ✓ Saved
                                          </span>
                                    )}
                                    {saveStatus === 'error' && (
                                          <span className="autosave-badge error" onClick={handleSave} style={{ cursor: 'pointer' }} title="Click to retry saving">
                                                ⚠️ Save failed (Retry)
                                          </span>
                                    )}
                              </div>
                              <div className="live-score-bar-track">
                                    <div
                                          className={`live-score-bar-fill ${liveATSScore < 50 ? 'bar-red' : liveATSScore < 70 ? 'bar-orange' : 'bar-green'}`}
                                          style={{ width: `${liveATSScore}%` }}
                                    />
                              </div>
                        </div>

                        <div className="header-actions">
                              <button
                                    type="button"
                                    className="btn btn-warning btn-sm btn-audit-mistakes"
                                    onClick={handleAuditResume}
                                    title="Check common fatal resume mistakes with voice assistant (गलतियाँ चेक करें)"
                              >
                                    🔍 Mistakes {detectedMistakes.length > 0 ? `(${detectedMistakes.length})` : '✓'}
                              </button>
                              <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => window.dispatchEvent(new CustomEvent('trigger-loku-ai-guide', { detail: { name: formData?.personal_info?.name || '' } }))}
                                    title="Get AI voice and step-by-step guidance"
                              >
                                    🎙️ AI Guide
                              </button>
                              <button onClick={handleAutoFill} type="button" className="btn btn-secondary btn-sm" title="Fill all fields with sample profile">
                                    ⚡ Sample Data
                              </button>
                              <button onClick={() => setShowATSModal(true)} type="button" className="btn btn-secondary btn-sm">
                                    🎯 ATS Matcher
                              </button>
                              <button onClick={() => setShowPreview(true)} type="button" className="btn btn-primary btn-sm">
                                    👁️ Preview
                              </button>
                              <button
                                    onClick={handleDownloadPDF}
                                    type="button"
                                    className={`btn btn-sm ${liveATSScore >= 50 ? 'btn-success' : 'btn-secondary'}`}
                                    title={liveATSScore >= 50 ? "Download Official PDF" : `Complete at least 50% of your resume to unlock PDF download (Current: ${Math.round(liveATSScore)}%)`}
                                    style={liveATSScore >= 50 ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', fontWeight: 600 } : { opacity: 0.85 }}
                              >
                                    {liveATSScore >= 50 ? '📥 Download PDF' : `🔒 PDF (${Math.round(liveATSScore)}% / 50%)`}
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
                                                { id: 'business_executive', name: '💼 Business Executive (Michael Scott)' },
                                                { id: 'business_timeline', name: '📊 Business Timeline (Tyler Vader)' },
                                                { id: 'modern', name: 'Modern Minimal' },
                                                { id: 'executive', name: 'Classic Executive' },
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
                                                      value={formData.pdf_preferences?.accent_color || '#e11d48'}
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
                              <h3>Saved ATS Optimization Score: <span className={score < 50 ? 'red' : score < 70 ? 'orange' : 'green'}>{score}%</span></h3>
                              {score < 50 ? (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔒 Reach 50%+ to unlock PDF download &amp; duplication</span>
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
                                    id={`step-badge-${step.num}`}
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

                                    <div className="form-group photo-management-card" style={{
                                          background: 'rgba(255, 255, 255, 0.03)',
                                          border: '1px solid var(--card-border, #334155)',
                                          borderRadius: '12px',
                                          padding: '16px',
                                          marginBottom: '20px'
                                    }}>
                                          <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', fontSize: '0.95rem' }}>
                                                📸 Profile Photo (Optional on Resume &amp; PDF)
                                          </label>

                                          {formData.personal_info?.profile_photo ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                      <img
                                                            src={formData.personal_info.profile_photo}
                                                            alt="Profile Preview"
                                                            style={{
                                                                  width: '68px',
                                                                  height: '68px',
                                                                  borderRadius: '50%',
                                                                  objectFit: 'cover',
                                                                  border: '2px solid var(--primary-color, #e11d48)',
                                                                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                                                            }}
                                                      />
                                                      <div style={{ flex: 1, minWidth: '220px' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                                                                  <input
                                                                        type="checkbox"
                                                                        checked={formData.pdf_preferences?.include_photo !== false}
                                                                        onChange={(e) => handleTogglePhoto(e.target.checked)}
                                                                        style={{ width: '18px', height: '18px', accentColor: '#e11d48', cursor: 'pointer' }}
                                                                  />
                                                                  <span>Include photo on Resume &amp; PDF</span>
                                                            </label>
                                                            <div style={{ fontSize: '0.78rem', color: formData.pdf_preferences?.include_photo !== false ? '#10b981' : '#94a3b8' }}>
                                                                  {formData.pdf_preferences?.include_photo !== false
                                                                        ? '✅ Photo will appear on your resume & downloaded PDF'
                                                                        : '👁️ Photo is hidden (will NOT appear on resume or PDF)'}
                                                            </div>
                                                      </div>
                                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <label className="btn btn-sm btn-secondary" style={{ cursor: uploadingPhoto ? 'not-allowed' : 'pointer', margin: 0, opacity: uploadingPhoto ? 0.7 : 1 }}>
                                                                  {uploadingPhoto ? '⏳ Uploading...' : '🔄 Change'}
                                                                  <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                                            </label>
                                                            <button
                                                                  type="button"
                                                                  disabled={uploadingPhoto}
                                                                  className="btn btn-sm btn-outline-danger"
                                                                  onClick={handleRemovePhoto}
                                                                  title="Delete photo permanently from resume"
                                                                  style={{ padding: '6px 12px', borderColor: '#ef4444', color: '#ef4444' }}
                                                            >
                                                                  🗑️ Remove
                                                            </button>
                                                      </div>
                                                </div>
                                          ) : (
                                                <div style={{
                                                      display: 'flex',
                                                      flexDirection: 'column',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      border: '2px dashed var(--card-border, #475569)',
                                                      borderRadius: '10px',
                                                      padding: '20px',
                                                      textAlign: 'center',
                                                      background: 'rgba(255, 255, 255, 0.01)'
                                                }}>
                                                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🖼️</div>
                                                      <label className="btn btn-sm btn-primary" style={{ cursor: uploadingPhoto ? 'not-allowed' : 'pointer', margin: '6px 0', background: 'var(--primary-color, #e11d48)', borderColor: 'var(--primary-color, #e11d48)', opacity: uploadingPhoto ? 0.7 : 1 }}>
                                                            {uploadingPhoto ? '⏳ Uploading to Cloud CDN...' : 'Choose Profile Photo'}
                                                            <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handlePhotoUpload} style={{ display: 'none' }} />
                                                      </label>
                                                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                                                            Supports JPG, PNG, WEBP (Max 5MB). Uploads directly to Cloud CDN.
                                                      </span>
                                                </div>
                                          )}
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
                                                placeholder={isBusiness ? "e.g. Regional Sales Director | P&L Management & B2B Revenue Growth" : "e.g. Senior Full-Stack Software Engineer | React & Python"}
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
                                                      placeholder={isBusiness ? "e.g. Michael Scott" : "e.g. Alex Morgan"}
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
                                                      placeholder="e.g. +91 9568804305"
                                                      required
                                                />
                                          </div>
                                          <div className="form-group">
                                                <label>Location (City, State / Country)</label>
                                                <input
                                                      type="text"
                                                      value={formData.personal_info?.location || ''}
                                                      onChange={(e) => setFormData({
                                                            ...formData,
                                                            personal_info: { ...formData.personal_info, location: e.target.value }
                                                      })}
                                                      placeholder={isBusiness ? "e.g. Scranton, Pennsylvania / Mumbai, MH" : "e.g. Bangalore, Karnataka / San Francisco, CA"}
                                                />
                                          </div>
                                    </div>

                                    {/* Stream-Tailored Professional Links */}
                                    {isBusiness ? (
                                          <>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>LinkedIn Profile URL *</label>
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
                                                      <div className="form-group">
                                                            <label>Executive Portfolio / Personal Website</label>
                                                            <input
                                                                  type="url"
                                                                  value={formData.personal_info?.portfolio || ''}
                                                                  onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        personal_info: { ...formData.personal_info, portfolio: e.target.value }
                                                                  })}
                                                                  placeholder="https://yourname.com"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Case Studies Deck / Corporate Profile Link (URL)</label>
                                                      <input
                                                            type="url"
                                                            value={formData.personal_info?.problem_solving || ''}
                                                            onChange={(e) => setFormData({
                                                                  ...formData,
                                                                  personal_info: { ...formData.personal_info, problem_solving: e.target.value }
                                                            })}
                                                            placeholder="https://drive.google.com/presentation/... or executive deck"
                                                      />
                                                </div>
                                          </>
                                    ) : (
                                          <>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>GitHub Profile URL</label>
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
                                                            <label>LinkedIn Profile URL</label>
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
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Problem Solving URL (LeetCode / GFG)</label>
                                                            <input
                                                                  type="url"
                                                                  value={formData.personal_info?.problem_solving || formData.personal_info?.leetcode || ''}
                                                                  onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        personal_info: { ...formData.personal_info, problem_solving: e.target.value, leetcode: e.target.value }
                                                                  })}
                                                                  placeholder="https://leetcode.com/username"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Portfolio / Website URL</label>
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
                                          </>
                                    )}
                              </div>
                        )}

                        {/* Step 2: Summary */}
                        {currentStep === 2 && (
                              <div className="form-step fade-in">
                                    <h2>📝 Step 2: Professional Summary</h2>
                                    <p className="step-description">
                                          {isBusiness
                                                ? 'Write a compelling executive summary highlighting revenue impact, team leadership, and strategic results'
                                                : 'Write a compelling software engineer summary highlighting your core tech stack, architecture, and achievements'}
                                    </p>

                                    {/* Quick 1-Click Summary Templates */}
                                    <div className="quick-summary-templates" style={{ marginBottom: '14px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                                💡 1-Click {isBusiness ? 'Business & Executive' : 'Tech Developer'} Templates (Click to fill):
                                          </span>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {(isBusiness ? [
                                                      {
                                                            label: '👔 Executive Sales & P&L',
                                                            text: 'Results-driven Business Executive with extensive experience leading cross-functional teams, optimizing P&L operations, and generating multimillion-dollar B2B revenue growth across competitive markets.'
                                                      },
                                                      {
                                                            label: '📊 Operations & Strategy',
                                                            text: 'Strategic Operations Leader recognized for streamlining corporate workflows, cutting overhead costs by 22%, managing key stakeholder relationships, and scaling enterprise delivery.'
                                                      },
                                                      {
                                                            label: '🤝 Client Retention & CRM',
                                                            text: 'Client Relationship Specialist with a proven track record in enterprise account retention, high-stakes contract negotiations, and sustained market expansion.'
                                                      }
                                                ] : [
                                                      {
                                                            label: '💻 Full-Stack Engineer',
                                                            text: 'Dynamic Full-Stack Software Engineer with strong expertise in React, Node.js, and cloud architectures, building scalable, high-concurrency web applications with sub-50ms latency.'
                                                      },
                                                      {
                                                            label: '⚡ Backend & Systems',
                                                            text: 'Backend Systems Engineer focused on distributed microservices, database query optimization, and secure RESTful APIs engineered for high-throughput enterprise scale.'
                                                      },
                                                      {
                                                            label: '🎨 Frontend & UI/UX',
                                                            text: 'Detail-oriented Frontend Developer dedicated to crafting accessible, pixel-perfect, and ultra-performant digital interfaces with modern React, TypeScript, and responsive design systems.'
                                                      }
                                                ]).map((tpl, tIdx) => (
                                                      <button
                                                            key={tIdx}
                                                            type="button"
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => setFormData({ ...formData, summary: tpl.text })}
                                                            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                                      >
                                                            {tpl.label}
                                                      </button>
                                                ))}
                                          </div>
                                    </div>

                                    <div className="form-group">
                                          <textarea
                                                value={formData.summary || ''}
                                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                rows={6}
                                                placeholder={isBusiness
                                                      ? "Dynamic, result-oriented Regional Manager with 10+ years of leadership across branch operations, client acquisitions, and corporate sales strategy. Proven track record boosting branch profitability by 140% and managing $4M+ P&L..."
                                                      : "Passionate Software Engineer with 4+ years of experience architecting scalable distributed cloud applications, microservices, and modern web architectures..."
                                                }
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
                                                            placeholder={isBusiness ? "e.g. MBA in Marketing & Finance / BBA" : "e.g. B.Tech in Computer Science & Engineering"}
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>College / University</label>
                                                      <input
                                                            type="text"
                                                            value={edu.college}
                                                            onChange={(e) => updateEducation(index, 'college', e.target.value)}
                                                            placeholder={isBusiness ? "e.g. Symbiosis Institute / IIM / Delhi University" : "e.g. XYZ Institute of Technology"}
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
                                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                                 <span className="suggestions-label">💡 Popular {isBusiness ? 'Business & Executive' : 'Tech Developer'} Skills (Click to add):</span>
                                                 <button
                                                       type="button"
                                                       className="btn btn-sm btn-secondary"
                                                       onClick={() => setFormData(prev => ({ ...prev, track: isBusiness ? 'tech' : 'business' }))}
                                                       style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                                                 >
                                                       Switch to {isBusiness ? 'Tech Skills' : 'Business Skills'}
                                                 </button>
                                           </div>
                                           <div className="popular-skills-pills">
                                                 {(isBusiness ? POPULAR_BUSINESS_SKILLS : POPULAR_TECH_SKILLS).map((sk) => {
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

                        {/* Step 5: References (Business Stream) or Projects (Tech Stream) */}
                        {currentStep === 5 && (
                              <div className="form-step fade-in">
                                    {isBusiness ? (
                                          <>
                                                <h2>🤝 Step 5: Professional References</h2>
                                                <p className="step-description">Add mentors, managers, or corporate executives who can vouch for your business performance</p>
                                                {(formData.references || []).map((refItem, index) => (
                                                      <div key={index} className="repeatable-item">
                                                            <div className="repeatable-item-header">
                                                                  <span className="item-badge">Reference #{index + 1}</span>
                                                                  <div className="item-reorder-actions">
                                                                        <button
                                                                              type="button"
                                                                              disabled={index === 0}
                                                                              onClick={() => moveItem('references', index, -1)}
                                                                              className="btn-icon"
                                                                              title="Move Up"
                                                                        >
                                                                              ⬆️
                                                                        </button>
                                                                        <button
                                                                              type="button"
                                                                              disabled={index === (formData.references || []).length - 1}
                                                                              onClick={() => moveItem('references', index, 1)}
                                                                              className="btn-icon"
                                                                              title="Move Down"
                                                                        >
                                                                              ⬇️
                                                                        </button>
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => removeReference(index)}
                                                                              className="btn-icon btn-icon-danger"
                                                                              title="Delete"
                                                                        >
                                                                              🗑️
                                                                        </button>
                                                                  </div>
                                                            </div>

                                                            <div className="form-row">
                                                                  <div className="form-group">
                                                                        <label>Reference Full Name *</label>
                                                                        <input
                                                                              type="text"
                                                                              value={refItem.name}
                                                                              onChange={(e) => updateReference(index, 'name', e.target.value)}
                                                                              placeholder="e.g. David Wallace"
                                                                        />
                                                                  </div>
                                                                  <div className="form-group">
                                                                        <label>Company / Organization *</label>
                                                                        <input
                                                                              type="text"
                                                                              value={refItem.company}
                                                                              onChange={(e) => updateReference(index, 'company', e.target.value)}
                                                                              placeholder="e.g. Dunder Mifflin Corporate"
                                                                        />
                                                                  </div>
                                                            </div>
                                                            <div className="form-row">
                                                                  <div className="form-group">
                                                                        <label>Designation / Role</label>
                                                                        <input
                                                                              type="text"
                                                                              value={refItem.role}
                                                                              onChange={(e) => updateReference(index, 'role', e.target.value)}
                                                                              placeholder="e.g. Chief Financial Officer (CFO)"
                                                                        />
                                                                  </div>
                                                                  <div className="form-group">
                                                                        <label>Phone Number</label>
                                                                        <input
                                                                              type="tel"
                                                                              value={refItem.phone}
                                                                              onChange={(e) => updateReference(index, 'phone', e.target.value)}
                                                                              placeholder="e.g. +1 (555) 302-8811"
                                                                        />
                                                                  </div>
                                                                  <div className="form-group">
                                                                        <label>Email Address</label>
                                                                        <input
                                                                              type="email"
                                                                              value={refItem.email}
                                                                              onChange={(e) => updateReference(index, 'email', e.target.value)}
                                                                              placeholder="e.g. dwallace@company.com"
                                                                        />
                                                                  </div>
                                                            </div>
                                                      </div>
                                                ))}
                                                <button onClick={addReference} type="button" className="btn btn-secondary">+ Add Reference</button>
                                          </>
                                    ) : (
                                          <>
                                                <h2>🚀 Step 5: Projects</h2>
                                                <p className="step-description">Showcase high-impact software projects with quantifiable metrics and tech stack</p>
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

                                                            <div className="form-row">
                                                                  <div className="form-group">
                                                                        <label>Project Title</label>
                                                                        <input
                                                                              type="text"
                                                                              value={proj.title}
                                                                              onChange={(e) => updateProject(index, 'title', e.target.value)}
                                                                              placeholder="e.g. ZUNO / AI Resume Platform"
                                                                        />
                                                                  </div>
                                                                  <div className="form-group">
                                                                        <label>Year / Duration</label>
                                                                        <input
                                                                              type="text"
                                                                              value={proj.date || ''}
                                                                              onChange={(e) => updateProject(index, 'date', e.target.value)}
                                                                              placeholder="e.g. 2025"
                                                                        />
                                                                  </div>
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
                                          </>
                                    )}
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
                                                            placeholder={isBusiness ? "e.g. Dunder Mifflin Paper Co. / HDFC Bank" : "e.g. Apex Tech Systems / Google"}
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Job Title / Role</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.role}
                                                                  onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                                  placeholder={isBusiness ? "e.g. Regional Sales Director / Operations Lead" : "e.g. Senior Software Engineer"}
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
                                                      <label>Key Responsibilities &amp; Impact (Include % and numbers for ATS)</label>
                                                      <textarea
                                                            value={exp.description}
                                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder={isBusiness
                                                                  ? "Spearheaded regional sales operations generating $4.2M ARR, boosted client retention by 38%, and led an 11-person account executive team."
                                                                  : "Architected distributed microservices handling 100K+ RPM, reducing latency by 45% and optimizing cloud infrastructure costs."
                                                            }
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
                                                                  placeholder="e.g. May 2026 or 2025"
                                                            />
                                                      </div>
                                                </div>
                                                <div className="form-group">
                                                      <label>Skills Learned (Optional)</label>
                                                      <input
                                                            type="text"
                                                            value={cert.skills_learned || ''}
                                                            onChange={(e) => updateCertification(index, 'skills_learned', e.target.value)}
                                                            placeholder="e.g. Ethical Hacking, Network Security, Java"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Proof / Credential Link (URL)</label>
                                                            <input
                                                                  type="url"
                                                                  value={cert.link || ''}
                                                                  onChange={(e) => updateCertification(index, 'link', e.target.value)}
                                                                  placeholder="https://coursera.org/verify/..."
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Upload Certificate (PDF / Image)</label>
                                                            <input
                                                                  type="file"
                                                                  accept=".pdf,image/*"
                                                                  onChange={(e) => handleCertificateUpload(index, e)}
                                                                  className="file-input-compact"
                                                            />
                                                            {uploadingCertIndex === index && (
                                                                  <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#38bdf8' }}>
                                                                        ⏳ Uploading certificate to Cloud CDN...
                                                                  </div>
                                                            )}
                                                            {cert.file_url && (
                                                                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#10b981', flexWrap: 'wrap' }}>
                                                                        <span>☁️ Attached: <strong>{cert.file_name || (cert.file_url.startsWith('http') ? 'Cloud CDN Document' : cert.file_url)}</strong></span>
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => {
                                                                                    if (cert.file_url && (cert.file_url.startsWith('http://') || cert.file_url.startsWith('https://'))) {
                                                                                          window.open(cert.file_url, '_blank');
                                                                                    } else if (cert.file_data) {
                                                                                          try {
                                                                                                const parts = cert.file_data.split(',');
                                                                                                const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
                                                                                                const bstr = atob(parts[1]);
                                                                                                let n = bstr.length;
                                                                                                const u8arr = new Uint8Array(n);
                                                                                                while (n--) u8arr[n] = bstr.charCodeAt(n);
                                                                                                const blob = new Blob([u8arr], { type: mime });
                                                                                                window.open(URL.createObjectURL(blob), '_blank');
                                                                                          } catch (err) {
                                                                                                console.error('Error previewing certificate:', err);
                                                                                          }
                                                                                    }
                                                                              }}
                                                                              style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', cursor: 'pointer', fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}
                                                                              title="Preview uploaded certificate"
                                                                        >
                                                                              Preview ↗
                                                                        </button>
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => {
                                                                                    updateCertification(index, 'file_data', '');
                                                                                    updateCertification(index, 'file_url', '');
                                                                                    updateCertification(index, 'file_name', '');
                                                                              }}
                                                                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                                                                              title="Remove attached file"
                                                                        >
                                                                              ✕
                                                                        </button>
                                                                  </div>
                                                            )}
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
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Date / Year</label>
                                                            <input
                                                                  type="text"
                                                                  value={ach.date || ''}
                                                                  onChange={(e) => updateAchievement(index, 'date', e.target.value)}
                                                                  placeholder="2026 or Aug 2025"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Proof / Verification Link (URL)</label>
                                                            <input
                                                                  type="url"
                                                                  value={ach.link || ''}
                                                                  onChange={(e) => updateAchievement(index, 'link', e.target.value)}
                                                                  placeholder="https://linkedin.com/posts/... or proof link"
                                                            />
                                                      </div>
                                                      <div className="form-group">
                                                            <label>Attach Proof Document (Photo / PDF)</label>
                                                            <input
                                                                  type="file"
                                                                  accept=".pdf,image/*"
                                                                  onChange={(e) => handleAchievementProofUpload(index, e)}
                                                                  className="file-input-compact"
                                                            />
                                                            {uploadingAchIndex === index && (
                                                                  <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#38bdf8' }}>
                                                                        ⏳ Uploading proof to Cloud CDN...
                                                                  </div>
                                                            )}
                                                            {ach.file_url && (
                                                                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#10b981', flexWrap: 'wrap' }}>
                                                                        <span>☁️ Attached: <strong>{ach.file_name || 'Cloud Proof Document'}</strong></span>
                                                                        <a
                                                                              href={ach.file_url}
                                                                              target="_blank"
                                                                              rel="noreferrer"
                                                                              style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', textDecoration: 'none', fontSize: '0.78rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}
                                                                        >
                                                                              View Proof ↗
                                                                        </a>
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => {
                                                                                    const newAchievements = [...(formData.achievements || [])];
                                                                                    newAchievements[index] = {
                                                                                          ...newAchievements[index],
                                                                                          file_url: '',
                                                                                          file_name: ''
                                                                                    };
                                                                                    setFormData({ ...formData, achievements: newAchievements });
                                                                              }}
                                                                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                                                                              title="Remove attached proof"
                                                                        >
                                                                              ✕
                                                                        </button>
                                                                  </div>
                                                            )}
                                                      </div>
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

                        {/* Step 9: Coding Profiles OR Languages & Hobbies */}
                        {currentStep === 9 && (
                              <div className="form-step fade-in">
                                    {isBusiness ? (
                                          <>
                                                <h2>🌐 Step 9: Languages &amp; Hobbies / Interests</h2>
                                                <p className="step-description">Executive resumes highlight multilingual fluency and leadership-focused personal interests</p>

                                                {/* Languages Section */}
                                                <div style={{ marginBottom: '28px', background: 'rgba(255, 255, 255, 0.03)', padding: '18px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                                            <div>
                                                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        🗣️ Spoken Languages
                                                                  </h4>
                                                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                        Rendered with visual proficiency bars in executive templates
                                                                  </span>
                                                            </div>
                                                            <button onClick={addLanguage} type="button" className="btn btn-sm btn-primary">
                                                                  + Add Language
                                                            </button>
                                                      </div>

                                                      {(!formData.languages || formData.languages.length === 0) ? (
                                                            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                                  No languages added yet. Click "+ Add Language" or pick from:
                                                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                                                                        {['English (Native)', 'Hindi (Fluent)', 'Spanish (Professional)', 'French (Intermediate)', 'German (Basic)'].map(preset => {
                                                                              const [lang, prof] = preset.replace(')', '').split(' (');
                                                                              return (
                                                                                    <button
                                                                                          key={preset}
                                                                                          type="button"
                                                                                          className="btn btn-sm btn-secondary"
                                                                                          onClick={() => {
                                                                                                const existing = formData.languages || [];
                                                                                                setFormData({
                                                                                                      ...formData,
                                                                                                      languages: [...existing, { language: lang, proficiency: prof || 'Fluent' }]
                                                                                                });
                                                                                          }}
                                                                                          style={{ fontSize: '0.8rem' }}
                                                                                    >
                                                                                          + {preset}
                                                                                    </button>
                                                                              );
                                                                        })}
                                                                  </div>
                                                            </div>
                                                      ) : (
                                                            formData.languages.map((langItem, idx) => {
                                                                  const langObj = typeof langItem === 'string' ? { language: langItem, proficiency: 'Fluent' } : langItem;
                                                                  return (
                                                                        <div key={idx} className="repeatable-item" style={{ marginBottom: '12px' }}>
                                                                              <div className="repeatable-item-header">
                                                                                    <span className="item-badge">Language #{idx + 1}</span>
                                                                                    <div className="item-reorder-actions">
                                                                                          <button
                                                                                                type="button"
                                                                                                onClick={() => removeLanguage(idx)}
                                                                                                className="btn-icon btn-icon-danger"
                                                                                                title="Delete Language"
                                                                                          >
                                                                                                🗑️
                                                                                          </button>
                                                                                    </div>
                                                                              </div>
                                                                              <div className="form-row">
                                                                                    <div className="form-group">
                                                                                          <label>Language</label>
                                                                                          <input
                                                                                                type="text"
                                                                                                value={langObj.language || ''}
                                                                                                onChange={(e) => updateLanguage(idx, 'language', e.target.value)}
                                                                                                placeholder="e.g. English, Hindi, Spanish"
                                                                                          />
                                                                                    </div>
                                                                                    <div className="form-group">
                                                                                          <label>Proficiency Level</label>
                                                                                          <select
                                                                                                value={langObj.proficiency || 'Fluent'}
                                                                                                onChange={(e) => updateLanguage(idx, 'proficiency', e.target.value)}
                                                                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                                                                                          >
                                                                                                <option value="Native / Bilingual" style={{ background: '#1e293b' }}>Native / Bilingual (100%)</option>
                                                                                                <option value="Fluent" style={{ background: '#1e293b' }}>Fluent (90%)</option>
                                                                                                <option value="Professional Working" style={{ background: '#1e293b' }}>Professional Working (75%)</option>
                                                                                                <option value="Intermediate" style={{ background: '#1e293b' }}>Intermediate (60%)</option>
                                                                                                <option value="Elementary" style={{ background: '#1e293b' }}>Elementary / Basic (40%)</option>
                                                                                          </select>
                                                                                    </div>
                                                                              </div>
                                                                        </div>
                                                                  );
                                                            })
                                                      )}
                                                </div>

                                                {/* Hobbies & Interests Section */}
                                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            🎯 Hobbies &amp; Executive Interests
                                                      </h4>
                                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '14px' }}>
                                                            Displayed in the left sidebar of your 2-column executive resume
                                                      </span>

                                                      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                                            <input
                                                                  type="text"
                                                                  value={hobbyInput}
                                                                  onChange={(e) => setHobbyInput(e.target.value)}
                                                                  onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                              e.preventDefault();
                                                                              handleAddHobby();
                                                                        }
                                                                  }}
                                                                  placeholder="Type interest (e.g. Strategic Chess, Public Speaking, Golf) and press Enter"
                                                                  style={{ flex: 1 }}
                                                            />
                                                            <button type="button" onClick={() => handleAddHobby()} className="btn btn-secondary">
                                                                  + Add
                                                            </button>
                                                      </div>

                                                      {/* Suggested Hobbies */}
                                                      <div style={{ marginBottom: '14px' }}>
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                                                                  💡 Suggested Interests:
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                  {['Strategic Chess', 'Public Speaking', 'Improv Comedy', 'Mentorship & Coaching', 'Golf', 'Financial Market Analysis', 'Marathon Running', 'Case Competitions'].map(h => (
                                                                        <button
                                                                              key={h}
                                                                              type="button"
                                                                              onClick={() => handleAddHobby(h)}
                                                                              className="btn btn-sm btn-secondary"
                                                                              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                                                                        >
                                                                              + {h}
                                                                        </button>
                                                                  ))}
                                                            </div>
                                                      </div>

                                                      {/* Active Hobbies Badges */}
                                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {(formData.hobbies || []).map((h, i) => (
                                                                  <span
                                                                        key={i}
                                                                        style={{
                                                                              display: 'inline-flex',
                                                                              alignItems: 'center',
                                                                              gap: '6px',
                                                                              background: 'rgba(59, 130, 246, 0.15)',
                                                                              border: '1px solid rgba(59, 130, 246, 0.35)',
                                                                              color: '#93c5fd',
                                                                              padding: '4px 10px',
                                                                              borderRadius: '20px',
                                                                              fontSize: '0.85rem'
                                                                        }}
                                                                  >
                                                                        {h}
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => handleRemoveHobby(h)}
                                                                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                                                              title="Remove"
                                                                        >
                                                                              ✕
                                                                        </button>
                                                                  </span>
                                                            ))}
                                                      </div>
                                                </div>
                                          </>
                                    ) : (
                                          <>
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
                                                                              disabled={index === (formData.coding_profiles || []).length - 1}
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
                                          </>
                                    )}
                              </div>
                        )}

                        {/* Step 10: Final Review */}
                        {currentStep === 10 && (
                              <div className="form-step fade-in">
                                    <h2>👀 Step 10: Final Review &amp; Save</h2>
                                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
                                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀</div>
                                          <h3>Your Resume Is Ready!</h3>
                                          <p style={{ color: 'var(--text-muted)', marginTop: '8px', maxWidth: '520px', margin: '8px auto 0' }}>
                                                Resume Completeness / ATS Score: <strong style={{ color: liveATSScore >= 50 ? '#10b981' : '#f59e0b' }}>{liveATSScore}%</strong>.
                                                {liveATSScore >= 50
                                                      ? ' 🎉 Congratulations! You have reached 50%+ and PDF download is unlocked.'
                                                      : ' ⚠️ 50% score required to download PDF. Fill in key sections (summary, skills, projects, education).'}
                                          </p>

                                          {/* Template & Color Customization */}
                                          <div style={{ margin: '20px auto', maxWidth: '540px', textAlign: 'left', background: 'rgba(255, 255, 255, 0.04)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <div style={{ marginBottom: '14px' }}>
                                                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                                            📄 Layout Template:
                                                      </label>
                                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {(isBusiness
                                                                  ? ['business_executive', 'business_timeline', 'executive', 'modern', 'compact']
                                                                  : ['modern', 'tech', 'business_executive', 'business_timeline', 'executive', 'compact']
                                                            ).map((t) => (
                                                                  <button
                                                                        key={t}
                                                                        type="button"
                                                                        className={`btn btn-sm ${formData.template_style === t ? 'btn-primary' : 'btn-secondary'}`}
                                                                        onClick={() => handleUpdatePreferences({ template_style: t })}
                                                                  >
                                                                        {t === 'business_executive' ? 'Business 2-Col Executive' : t === 'business_timeline' ? 'Business Timeline' : t.charAt(0).toUpperCase() + t.slice(1)}
                                                                  </button>
                                                            ))}
                                                      </div>
                                                </div>
                                                <div>
                                                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                                            🎨 Resume Color Theme:
                                                      </label>
                                                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {colorPresets.map((c) => {
                                                                  const currentAccent = (formData.pdf_preferences?.accent_color || '#111827').toLowerCase();
                                                                  const isSelected = currentAccent === c.color.toLowerCase();
                                                                  return (
                                                                        <button
                                                                              key={c.color}
                                                                              type="button"
                                                                              onClick={() => handleUpdatePreferences({ accent_color: c.color })}
                                                                              style={{
                                                                                    width: 32,
                                                                                    height: 32,
                                                                                    borderRadius: '50%',
                                                                                    backgroundColor: c.color,
                                                                                    border: isSelected ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.25)',
                                                                                    boxShadow: isSelected ? `0 0 0 2px ${c.color}, 0 2px 8px rgba(0,0,0,0.3)` : 'none',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.15s ease'
                                                                              }}
                                                                              title={`${c.name} (${c.color})`}
                                                                        />
                                                                  );
                                                            })}
                                                            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                                  Selected: <strong style={{ color: '#ffffff' }}>{colorPresets.find(c => c.color.toLowerCase() === (formData.pdf_preferences?.accent_color || '#111827').toLowerCase())?.name || 'Custom'}</strong>
                                                            </span>
                                                      </div>
                                                </div>
                                          </div>

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
                                                <button
                                                      onClick={handleDownloadPDF}
                                                      type="button"
                                                      className={`btn ${liveATSScore >= 50 ? 'btn-download-unlocked' : 'btn-download-locked'}`}
                                                      style={
                                                            liveATSScore >= 50
                                                                  ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', fontWeight: 600 }
                                                                  : { opacity: 0.75 }
                                                      }
                                                >
                                                      {liveATSScore >= 50 ? `📄 Download Official PDF (${liveATSScore}%)` : `🔒 Download PDF (${liveATSScore}% / 50%)`}
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
                        <button
                              onClick={handleDownloadPDF}
                              type="button"
                              className={`btn btn-sm ${liveATSScore >= 50 ? 'btn-success' : 'btn-secondary'}`}
                              title={liveATSScore >= 50 ? 'Download PDF' : 'Score must be at least 50% to download'}
                        >
                              {liveATSScore >= 50 ? '📄 PDF' : '🔒 50%'}
                        </button>
                  </div>

                  {/* Modals */}
                  {/* Real-time Voice Resume Mistake Inspector Modal */}
                  {showMistakesModal && (
                        <div className="modal-backdrop-blur" onClick={() => { stopAuditVoice(); setShowMistakesModal(false); }}>
                              <div className="modal-dialog-content mistakes-audit-modal" onClick={(e) => e.stopPropagation()}>
                                    <div className="modal-header-row">
                                          <div>
                                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                      <span>🔍 Resume Mistake Audit</span>
                                                      <span className="mistake-count-badge" style={{
                                                            background: detectedMistakes.length > 0 ? '#ef4444' : '#10b981',
                                                            color: '#fff',
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px'
                                                      }}>
                                                            {detectedMistakes.length} {detectedMistakes.length === 1 ? 'Issue' : 'Issues'}
                                                      </span>
                                                </h3>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                      AI Voice Assistant proactively checking common fatal resume mistakes
                                                </span>
                                          </div>
                                          <button
                                                type="button"
                                                className="modal-close-btn"
                                                onClick={() => {
                                                      stopAuditVoice();
                                                      setShowMistakesModal(false);
                                                }}
                                          >
                                                ✕
                                          </button>
                                    </div>

                                    {/* Voice Controls Bar */}
                                    <div className="voice-controls-strip">
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '1.4rem' }}>{isAuditingVoice ? '🔊' : '🎙️'}</span>
                                                <div>
                                                      <strong style={{ fontSize: '0.88rem', display: 'block' }}>Voice Assistant:</strong>
                                                      <span style={{ fontSize: '0.78rem', color: isAuditingVoice ? '#38bdf8' : 'var(--text-muted)' }}>
                                                            {isAuditingVoice ? 'Speaking mistakes aloud...' : 'Click below to hear your mistakes spoken aloud'}
                                                      </span>
                                                </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                      type="button"
                                                      className="btn btn-sm btn-primary"
                                                      onClick={() => speakAuditReport('hi')}
                                                      style={{ fontSize: '0.8rem' }}
                                                >
                                                      🗣️ हिंदी में सुनें
                                                </button>
                                                <button
                                                      type="button"
                                                      className="btn btn-sm btn-secondary"
                                                      onClick={() => speakAuditReport('en')}
                                                      style={{ fontSize: '0.8rem' }}
                                                >
                                                      🗣️ Listen (English)
                                                </button>
                                                {isAuditingVoice && (
                                                      <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={stopAuditVoice}
                                                            style={{ fontSize: '0.8rem' }}
                                                      >
                                                            ⏹️ Stop
                                                      </button>
                                                )}
                                          </div>
                                    </div>

                                    {/* Mistakes List */}
                                    <div className="mistakes-list-container">
                                          {detectedMistakes.length === 0 ? (
                                                <div className="no-mistakes-card">
                                                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎉</div>
                                                      <h4>No Critical Mistakes Found!</h4>
                                                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                            Your resume is complete and formatted for recruiter screening and ATS parsing. You are ready to download your PDF!
                                                      </p>
                                                </div>
                                          ) : (
                                                detectedMistakes.map((m) => (
                                                      <div key={m.id} className={`mistake-item-card severity-${m.severity}`}>
                                                            <div className="mistake-header">
                                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span className={`severity-tag ${m.severity}`}>
                                                                              {m.severity === 'critical' ? '🔴 FATAL MISTAKE' : '🟠 WARNING'}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                              Step {m.step}
                                                                        </span>
                                                                  </div>
                                                                  <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-primary fix-step-btn"
                                                                        onClick={() => {
                                                                              stopAuditVoice();
                                                                              setShowMistakesModal(false);
                                                                              setCurrentStep(m.step);
                                                                              showToast(`Navigated to Step ${m.step}. Let's fix this!`, 'info');
                                                                        }}
                                                                  >
                                                                        👉 Fix in Step {m.step} →
                                                                  </button>
                                                            </div>
                                                            <div className="mistake-body">
                                                                  <h4 className="mistake-title-en">{m.titleEn}</h4>
                                                                  <p className="mistake-title-hi">⚠️ <em>{m.titleHi}</em></p>
                                                                  <p className="mistake-desc-en">{m.descEn}</p>
                                                                  <p className="mistake-desc-hi">{m.descHi}</p>
                                                            </div>
                                                      </div>
                                                ))
                                          )}
                                    </div>

                                    <div className="modal-footer-row" style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                💡 Resolving these issues significantly boosts your ATS score and shortlist probability.
                                          </span>
                                          <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                      stopAuditVoice();
                                                      setShowMistakesModal(false);
                                                }}
                                          >
                                                Close Inspector
                                          </button>
                                    </div>
                              </div>
                        </div>
                  )}

                  {showPreview && (
                        <ErrorBoundary onReset={() => setShowPreview(false)}>
                              <ResumePreview
                                    formData={formData}
                                    score={liveATSScore}
                                    onDownloadPDF={handleDownloadPDF}
                                    onUpdatePreferences={handleUpdatePreferences}
                                    onClose={() => setShowPreview(false)}
                              />
                        </ErrorBoundary>
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

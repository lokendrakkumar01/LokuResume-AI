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

const POPULAR_SKILLS = [
      'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'FastAPI',
      'Docker', 'AWS', 'PostgreSQL', 'MongoDB', 'Redis', 'Git', 'Next.js',
      'GraphQL', 'Tailwind CSS', 'CI/CD', 'REST APIs', 'Kubernetes'
];

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
      const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
      const isInitialMount = useRef(true);

      // Inline skill input state
      const [skillInput, setSkillInput] = useState('');

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
                  certifications: [],
                  achievements: [],
                  languages: [],
                  interests: [],
                  custom_sections: [],
                  template_style: 'modern',
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
            if (formData.projects && formData.projects.length > 0 && formData.projects[0].title) pts += 10;
            if (formData.experience && formData.experience.length > 0 && formData.experience[0].company) pts += 5;
            if (formData.certifications && formData.certifications.length > 0 && formData.certifications[0].name) pts += 5;
            if (formData.achievements && formData.achievements.length > 0 && formData.achievements[0].title) pts += 5;
            if (formData.coding_profiles && formData.coding_profiles.length > 0) pts += 5;
            return Math.min(100, pts);
      }, [formData]);

      const fetchResume = async () => {
            try {
                  const response = await axios.get(`${config.API_BASE_URL}/resumes/${id}`, {
                        headers: getAuthHeader()
                  });

                  const data = response.data;
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
                        data.template_style = 'modern';
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

            const updated = {
                  ...formData,
                  template_style: nextTemplate,
                  pdf_preferences: {
                        ...(formData.pdf_preferences || {}),
                        background_color: '#ffffff',
                        accent_color: nextColor
                  }
            };
            setFormData(updated);

            if (id) {
                  try {
                        await axios.put(`${config.API_BASE_URL}/resumes/${id}/preferences`, {
                              template_style: nextTemplate,
                              accent_color: nextColor
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
                                    accent_color: targetColor
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
                                    accent_color: targetColor
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
                        template_style: targetTemplate
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
            setFormData({
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
      const handleCertificateUpload = (index, e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                  showToast('Certificate file should be under 2MB', 'warning');
                  return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                  updateCertification(index, 'file_data', reader.result);
                  updateCertification(index, 'file_url', file.name);
                  showToast(`Attached ${file.name}`, 'success');
            };
            reader.readAsDataURL(file);
      };
      const removeCertification = (index) => {
            setFormData({ ...formData, certifications: (formData.certifications || []).filter((_, i) => i !== index) });
      };

      // Achievements handlers
      const addAchievement = () => {
            setFormData({
                  ...formData,
                  achievements: [...(formData.achievements || []), { title: '', description: '', date: '', link: '' }]
            });
      };
      const updateAchievement = (index, field, value) => {
            const newAchievements = [...(formData.achievements || [])];
            if (newAchievements[index]) {
                  newAchievements[index] = { ...newAchievements[index], [field]: value };
                  setFormData({ ...formData, achievements: newAchievements });
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
            { name: 'Black', color: '#111827' },
            { name: 'Blue', color: '#1e40af' },
            { name: 'Green', color: '#059669' },
            { name: 'Purple', color: '#7c3aed' },
            { name: 'Red', color: '#dc2626' }
      ];

      return (
            <div className="resume-builder">
                  {/* Top Builder Bar */}
                  <div className="builder-header">
                        <div className="header-left-col">
                              <div className="title-row">
                                    <h1>{id ? '✏️ Edit Resume' : '✨ Create Resume'}</h1>
                                    <span className="live-score-pill" title="Real-time estimated ATS score">
                                          🎯 ATS Ready: <strong>{liveATSScore}%</strong>
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

                                    <div className="form-group">
                                          <label>Profile Photo (Optional)</label>
                                          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                                          {formData.personal_info?.profile_photo && <small>✅ Profile Photo Selected</small>}
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
                                                placeholder="e.g. Senior Full-Stack Software Engineer | React & Python"
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
                                                      placeholder="e.g. Alex Morgan"
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
                                                      placeholder="e.g. Etah, Uttar Pradesh"
                                                />
                                          </div>
                                    </div>

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
                              </div>
                        )}

                        {/* Step 2: Summary */}
                        {currentStep === 2 && (
                              <div className="form-step fade-in">
                                    <h2>📝 Step 2: Professional Summary</h2>
                                    <p className="step-description">Write a compelling summary highlighting your key achievements (50-150 words)</p>
                                    <div className="form-group">
                                          <textarea
                                                value={formData.summary || ''}
                                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                rows={6}
                                                placeholder="Passionate Software Engineer with 5+ years of experience architecting distributed cloud applications..."
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
                                                            placeholder="B.Tech in Computer Science"
                                                      />
                                                </div>
                                                <div className="form-group">
                                                      <label>College / University</label>
                                                      <input
                                                            type="text"
                                                            value={edu.college}
                                                            onChange={(e) => updateEducation(index, 'college', e.target.value)}
                                                            placeholder="XYZ Institute of Technology"
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
                                          <span className="suggestions-label">💡 Popular Tech Skills (Click to add):</span>
                                          <div className="popular-skills-pills">
                                                {POPULAR_SKILLS.map((sk) => {
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

                        {/* Step 5: Projects */}
                        {currentStep === 5 && (
                              <div className="form-step fade-in">
                                    <h2>🚀 Step 5: Projects</h2>
                                    <p className="step-description">Showcase high-impact projects with metrics and tech stack</p>
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
                                                            placeholder="Apex Tech Systems"
                                                      />
                                                </div>
                                                <div className="form-row">
                                                      <div className="form-group">
                                                            <label>Job Title / Role</label>
                                                            <input
                                                                  type="text"
                                                                  value={exp.role}
                                                                  onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                                  placeholder="Senior Software Engineer"
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
                                                      <label>Key Responsibilities &amp; Impact</label>
                                                      <textarea
                                                            value={exp.description}
                                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                            rows={3}
                                                            placeholder="Architected distributed microservices reducing latency by 45%..."
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
                                                            {cert.file_url && (
                                                                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#10b981' }}>
                                                                        <span>📎 Attached: <strong>{cert.file_url}</strong></span>
                                                                        <button
                                                                              type="button"
                                                                              onClick={() => {
                                                                                    updateCertification(index, 'file_data', '');
                                                                                    updateCertification(index, 'file_url', '');
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

                        {/* Step 9: Coding Profiles */}
                        {currentStep === 9 && (
                              <div className="form-step fade-in">
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
                                                                  disabled={index === formData.coding_profiles.length - 1}
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
                                                            {['modern', 'executive', 'tech', 'compact'].map((t) => (
                                                                  <button
                                                                        key={t}
                                                                        type="button"
                                                                        className={`btn btn-sm ${formData.template_style === t ? 'btn-primary' : 'btn-secondary'}`}
                                                                        onClick={() => handleUpdatePreferences({ template_style: t })}
                                                                  >
                                                                        {t.charAt(0).toUpperCase() + t.slice(1)}
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

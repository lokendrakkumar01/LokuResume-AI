import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import '../styles/AIChatAssistant.css';

const MESSAGES_BY_LANG = {
      hi: {
            welcome: "👋 नमस्ते! मैं आपका **LokiResume AI करियर और ATS कोच** हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• 🎯 अपना ATS स्कोर 90%+ तक ले जाने में\n• ✍️ Google XYZ फॉर्मूला से असरदार बुलेट पॉइंट्स लिखने में\n• 💼 Tech और Business दोनों के लिए कस्टमाइज्ड टूल्स\n• 🎙️ आप नीचे दिए गए माइक बटन को दबाकर हिंदी में बोलकर भी सवाल पूछ सकते हैं!",
            placeholder: "माइक 🎙️ दबाकर बोलें या सवाल टाइप करें...",
            listening: "सुन रहा हूँ... अब बोलिए (हिंदी या इंग्लिश)",
            chipsTech: [
                  "🚀 शुरुआत कैसे करें? (गाइड)",
                  "🎯 ATS स्कोर 90%+ कैसे करें?",
                  "✍️ सॉफ्टवेयर इंजीनियर की समरी लिखो",
                  "💡 5 दमदार एक्शन वर्ब्स",
                  "🔍 ATS Job Matcher कैसे इस्तेमाल करें?",
                  "🛡️ LeetCode और GitHub प्रोफाइल्स"
            ],
            chipsBusiness: [
                  "💼 बिजनेस समरी कैसे लिखें?",
                  "🎯 ATS स्कोर 90%+ कैसे करें?",
                  "🤝 रेफरेंसेज (References) कैसे जोड़ें?",
                  "📊 टॉप 10 बिजनेस स्किल्स",
                  "🌟 Michael Scott टेम्पलेट कैसे इस्तेमाल करें?",
                  "🗣️ भाषाएं व हॉबीज (Languages & Hobbies)"
            ],
            fallbackDefault: "ATS स्कोर 90%+ करने के लिए अपने हर प्रोजेक्ट में संख्या (Numbers) जोड़ें और जॉब पोस्टिंग से 10+ मुख्य स्किल्स शामिल करें!",
            fallbackVerbs: "पावरफुल वर्ब्स का उपयोग करें: Architected, Spearheaded, Automated, Engineered, Streamlined. 'Worked on' जैसे कमज़ोर शब्द न लिखें।",
            fallbackSummary: "समरी फॉर्मूला: [अनुभव के वर्ष / रोल] + [प्रमुख टेक्नोलॉजीज़ या बिजनेस डोमेन] + [ठोस उपलब्धि]। 40 से 80 शब्दों में रखें।"
      },
      en: {
            welcome: "👋 Hi! I'm your **LokiResume AI Career & ATS Coach**.\n\nI can help you:\n• 🎯 Optimize your ATS Score to 90%+\n• ✍️ Write high-impact bullet points with numbers\n• 💼 Tailor tools for Tech & Business students\n• 🎙️ You can also speak to me in English using the microphone button!",
            placeholder: "Speak with mic 🎙️ or type your question...",
            listening: "Listening... Speak your question now",
            chipsTech: [
                  "🚀 How to get started? (Guide)",
                  "🎯 How to get 90%+ ATS Score?",
                  "✍️ Write summary for Full Stack Engineer",
                  "💡 5 high-impact action verbs",
                  "🔍 How to use ATS Job Matcher?",
                  "🛡️ LeetCode & GitHub profile tips"
            ],
            chipsBusiness: [
                  "💼 How to write Executive Summary?",
                  "🎯 How to get 90%+ ATS Score?",
                  "🤝 How to format References properly?",
                  "📊 Top 10 Business & Management Skills",
                  "🌟 How to use Michael Scott Executive template?",
                  "🗣️ Languages & Hobbies formatting"
            ],
            fallbackDefault: "Quantify your achievements with numbers (e.g. 'reduced costs by 25%' or 'improved latency by 40%') and match 10+ core keywords for a 90%+ ATS score!",
            fallbackVerbs: "Use power verbs: Spearheaded, Negotiated, Optimized, Streamlined, Orchestrated, and Engineered. Avoid generic terms like 'worked on'.",
            fallbackSummary: "Summary Formula: [Years of Experience / Role] + [Key Business or Tech Domain] + [Proven High-Impact Metric]. Keep it between 40-90 words."
      }
};

const generateOnboardingGuide = (userName, targetLang) => {
      const isHi = targetLang === 'hi';
      const cleanName = userName ? userName.trim().split(' ')[0] : '';
      const salutation = cleanName ? (isHi ? `नमस्ते ${cleanName}!` : `Welcome ${cleanName}!`) : (isHi ? 'नमस्ते!' : 'Welcome!');

      if (isHi) {
            return {
                  text: `👋 **${salutation} LokuResume AI में आपका स्वागत है।** 🌟\n\nआइए मिलकर आपका रेज़्युमे **90%+ ATS स्कोर** वाला बनाएं! यहाँ आपके लिए 4 सबसे महत्वपूर्ण स्टेप्स हैं:\n\n1. 🚀 **शुरुआत (Start)**: Dashboard पर **'Create Resume'** दबाएं या तुरंत **'1-Click AI Sample'** लोड करें ताकि आपका समय बचे।\n2. 📝 **समरी और प्रोफाइल्स**: 40-70 शब्दों की असरदार समरी लिखें और LeetCode, GitHub या LinkedIn लिंक जोड़ें।\n3. 💼 **10-15 मुख्य स्किल्स**: अपने रोल से जुड़ी मुख्य स्किल्स जोड़ें। प्रोजेक्ट्स में आंकड़े (जैसे: '40% लेटेंसी कम की', '10,000+ यूज़र्स') जरूर लिखें।\n4. 🎯 **ATS Job Matcher**: जिस नौकरी में अप्लाई कर रहे हैं, उसकी जॉब डिस्क्रिप्शन पेस्ट करके चेक करें कि क्या मिसिंग है!\n\n🎙️ आप नीचे माइक दबाकर मुझसे कोई भी सवाल सीधे हिंदी में पूछ सकते हैं!`,
                  speech: `${salutation} LokuResume AI में आपका स्वागत है। आइए मिलकर आपका रेज़्युमे 90%+ ATS स्कोर वाला बनाएं। सबसे पहले Dashboard पर Create Resume पर क्लिक करें या One Click Sample लोड करें। फिर 10 से 15 मुख्य स्किल्स जोड़ें और प्रोजेक्ट्स में आंकड़े लिखें। इसके बाद ATS Job Matcher से अपनी जॉब मैचिंग चेक करें। आप मुझसे कोई भी सवाल पूछ सकते हैं!`
            };
      } else {
            return {
                  text: `👋 **${salutation} Welcome to LokuResume AI!** 🌟\n\nLet's build a **90%+ ATS resume** that lands interviews! Here are your 4 essential steps:\n\n1. 🚀 **Get Started**: Click **'Create Resume'** or load the **'1-Click AI Sample'** on your dashboard.\n2. 📝 **Summary & Links**: Add a 40-70 word summary with numbers, plus your GitHub, LeetCode, or LinkedIn links.\n3. 💼 **10-15 Core Skills**: Include in-demand technical skills. In project bullet points, always quantify your impact (e.g. 'reduced latency by 40%').\n4. 🎯 **ATS Job Matcher**: Paste your target job post into the ATS Analyzer to verify matching keywords and score!\n\n🎙️ Ask me anything anytime using the mic button or chat!`,
                  speech: `${salutation} Welcome to LokuResume AI! Let's build a 90%+ ATS resume that lands interviews. Start by clicking Create Resume or loading the One Click Sample. Add 10 to 15 core skills and quantify your project achievements with numbers. Then run ATS Job Matcher to check keyword alignment. Feel free to ask me anything with voice or chat!`
            };
      }
};

function AIChatAssistant() {
      const { studentTrack, setStudentTrack, user } = useAuth();
      const [isOpen, setIsOpen] = useState(false);
      const [language, setLanguage] = useState(() => {
            return localStorage.getItem('ai_chat_lang') || 'hi';
      });
      const [messages, setMessages] = useState(() => [
            {
                  sender: 'ai',
                  text: MESSAGES_BY_LANG[language || 'hi'].welcome,
                  timestamp: new Date()
            }
      ]);
      const [inputText, setInputText] = useState('');
      const [loading, setLoading] = useState(false);
      const [isListening, setIsListening] = useState(false);
      const [isSpeaking, setIsSpeaking] = useState(false);
      const [voiceEnabled, setVoiceEnabled] = useState(true);

      const messagesEndRef = useRef(null);
      const recognitionRef = useRef(null);

      // Auto scroll to bottom
      const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };

      useEffect(() => {
            if (isOpen) {
                  scrollToBottom();
            }
      }, [messages, isOpen]);

      // Change language handler
      const handleLanguageChange = (newLang) => {
            if (newLang === language) return;
            setLanguage(newLang);
            localStorage.setItem('ai_chat_lang', newLang);

            // Update recognition language
            if (recognitionRef.current) {
                  recognitionRef.current.lang = newLang === 'hi' ? 'hi-IN' : 'en-US';
            }

            // Append a friendly transition message
            const switchMsg = {
                  sender: 'ai',
                  text: newLang === 'hi'
                        ? "🇮🇳 भाषा हिंदी में सेट हो गई है! अब आप हिंदी में सवाल पूछ सकते हैं या सुन सकते हैं।"
                        : "🇺🇸 Language switched to English! You can now speak and listen in English.",
                  timestamp: new Date()
            };
            setMessages((prev) => [...prev, switchMsg]);
            speakText(switchMsg.text, newLang);
      };

      // Trigger Stream Selection Onboarding Guide & Voice
      const triggerStreamWelcome = (targetLang) => {
            const currentLang = targetLang || language;
            const isHi = currentLang === 'hi';

            setIsOpen(true);
            const promptMsg = {
                  sender: 'ai',
                  isStreamPrompt: true,
                  text: isHi
                        ? "👋 **नमस्ते! LokuResume AI में आपका स्वागत है।** 🎓\n\nआप अपना रेज़्युमे किस स्ट्रीम के लिए बनाना चाहते हैं?\n• 💻 **Tech Student / Developer**: LeetCode, GitHub, कोड प्रोजेक्ट्स, टेक्निकल स्किल्स\n• 💼 **Business Student / Executive**: Michael Scott 2-कॉलम लेआउट, रेफरेंसेज, मैनेजमेंट स्किल्स\n\nनीचे दिए गए विकल्प को चुनें या बोलकर बताएं (जैसे: 'Business' या 'Tech')!"
                        : "👋 **Welcome to LokuResume AI!** 🎓\n\nWhich stream are you building your resume for?\n• 💻 **Tech Student / Developer**: LeetCode, GitHub, coding projects, tech stacks\n• 💼 **Business Student / Executive**: 2-Column Executive layout, References, Hobbies, P&L skills\n\nTap an option below or speak your choice (e.g. 'Business' or 'Tech')!",
                  speech: isHi
                        ? "नमस्ते! LokuResume AI में आपका स्वागत है। क्या आप बिजनेस के छात्र हैं या टेक के छात्र हैं? नीचे दिए गए विकल्प पर टैप करें या बोलकर बताएं।"
                        : "Welcome to LokuResume AI! Are you a Business student or a Tech student? Please tap an option below or speak your choice.",
                  timestamp: new Date()
            };

            setMessages((prev) => [...prev, promptMsg]);
            setTimeout(() => {
                  speakText(promptMsg.speech, currentLang);
            }, 600);
      };

      const handleSelectStream = (chosenTrack) => {
            if (setStudentTrack) {
                  setStudentTrack(chosenTrack);
            }
            const isHi = language === 'hi';
            const confirmMsg = chosenTrack === 'business'
                  ? {
                        sender: 'ai',
                        text: isHi
                              ? "💼 **बिजनेस (Business / Executive) स्ट्रीम चुन लिया गया है!**\n\n✨ आपके लिए एक्टिवेट किया गया:\n• 🌟 Michael Scott 2-कॉलम एग्जीक्यूटिव टेम्पलेट\n• 🤝 रेफरेंसेज (References) और मैनेजमेंट स्किल्स\n• 🌐 भाषाएं (Languages) व हॉबीज (Hobbies)\n\nअब आप 'Create Resume' दबाकर या '1-Click Sample' से तुरंत शुरू कर सकते हैं!"
                              : "💼 **Business / Executive Stream Selected!**\n\n✨ Activated for you:\n• 🌟 Michael Scott 2-Column Executive Template\n• 🤝 References section & Business Management Skills\n• 🌐 Language proficiencies & Hobbies\n\nYou can now start building your executive resume!",
                        speech: isHi
                              ? "बिजनेस स्ट्रीम चुन लिया गया है! आपके लिए दो कॉलम एग्जीक्यूटिव टेम्पलेट और रेफरेंस टूल्स एक्टिवेट कर दिए गए हैं।"
                              : "Business stream selected! The executive two-column template and business tools have been activated for you.",
                        timestamp: new Date()
                  }
                  : {
                        sender: 'ai',
                        text: isHi
                              ? "💻 **टेक (Tech / Developer) स्ट्रीम चुन लिया गया है!**\n\n✨ आपके लिए एक्टिवेट किया गया:\n• 🛡️ LeetCode, GitHub और कोड प्रोफाइल्स\n• 🚀 फुल-स्टैक और सॉफ्टवेयर प्रोजेक्ट्स\n• 🎯 90%+ ATS स्कोरिंग और टेक्निकल स्किल्स\n\nअब आप 'Create Resume' दबाकर या '1-Click Sample' से तुरंत शुरू कर सकते हैं!"
                              : "💻 **Tech / Developer Stream Selected!**\n\n✨ Activated for you:\n• 🛡️ LeetCode, GitHub & Coding profiles\n• 🚀 Full-stack & Software engineering projects\n• 🎯 90%+ ATS scoring with technical keywords\n\nYou can now start building your developer resume!",
                        speech: isHi
                              ? "टेक स्ट्रीम चुन लिया गया है! आपके लिए कोडिंग प्रोफाइल्स और टेक्निकल स्किल्स एक्टिवेट कर दिए गए हैं।"
                              : "Tech stream selected! Coding profiles and technical skills tools have been activated for you.",
                        timestamp: new Date()
                  };

            setMessages((prev) => [...prev, confirmMsg]);
            speakText(confirmMsg.speech, language);
      };

      // Setup Speech Recognition with dynamic language
      useEffect(() => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                  const recognition = new SpeechRecognition();
                  recognition.continuous = false;
                  recognition.interimResults = false;
                  recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

                  recognition.onstart = () => {
                        setIsListening(true);
                  };

                  recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        if (transcript) {
                              setInputText(transcript);
                              handleSend(transcript);
                        }
                  };

                  recognition.onerror = (event) => {
                        console.warn('Speech recognition error:', event.error);
                        setIsListening(false);
                  };

                  recognition.onend = () => {
                        setIsListening(false);
                  };

                  recognitionRef.current = recognition;
            }
      }, [language]);

      // Trigger Onboarding Voice & Chat Guide
      const triggerVoiceGuide = (userName, targetLang) => {
            const currentLang = targetLang || language;
            const guide = generateOnboardingGuide(userName, currentLang);

            setIsOpen(true);
            const guideMsg = {
                  sender: 'ai',
                  text: guide.text,
                  speech: guide.speech,
                  isGuide: true,
                  suggestions: currentLang === 'hi' ? [
                        "🎯 ATS स्कोर 90%+ कैसे करें?",
                        "✍️ 1-Click AI Sample कैसे इस्तेमाल करें?",
                        "💡 Google XYZ फॉर्मूला क्या है?",
                        "🔍 ATS Job Matcher कैसे इस्तेमाल करें?"
                  ] : [
                        "🎯 How to get 90%+ ATS Score?",
                        "✍️ How to use 1-Click AI Sample?",
                        "💡 What is Google XYZ formula?",
                        "🔍 How to use ATS Job Matcher?"
                  ],
                  timestamp: new Date()
            };

            setMessages((prev) => [...prev, guideMsg]);

            // Audio speech announcement with a slight delay for audio synthesis initialization
            setTimeout(() => {
                  speakText(guide.speech, currentLang);
            }, 600);
      };

      // Listen for login/signup triggers or manual guide requests
      useEffect(() => {
            const handleGuideEvent = (e) => {
                  const userName = e.detail?.name || '';
                  triggerVoiceGuide(userName, language);
            };

            const handleStreamWelcomeEvent = () => {
                  triggerStreamWelcome(language);
            };

            window.addEventListener('trigger-loku-ai-guide', handleGuideEvent);
            window.addEventListener('trigger-stream-welcome', handleStreamWelcomeEvent);

            // Check if stream welcome was requested in sessionStorage
            if (sessionStorage.getItem('loku_stream_welcome_trigger')) {
                  sessionStorage.removeItem('loku_stream_welcome_trigger');
                  setTimeout(() => {
                        triggerStreamWelcome(language);
                  }, 800);
            }

            // Check if user just logged in or registered
            const pendingGuide = sessionStorage.getItem('loku_ai_guide_trigger');
            if (pendingGuide) {
                  try {
                        const parsed = JSON.parse(pendingGuide);
                        sessionStorage.removeItem('loku_ai_guide_trigger');
                        setTimeout(() => {
                              triggerVoiceGuide(parsed.name, language);
                        }, 800);
                  } catch (e) {
                        sessionStorage.removeItem('loku_ai_guide_trigger');
                  }
            }

            return () => {
                  window.removeEventListener('trigger-loku-ai-guide', handleGuideEvent);
                  window.removeEventListener('trigger-stream-welcome', handleStreamWelcomeEvent);
            };
      }, [language]);

      // Text-to-Speech Audio Playback with voice selection
      const speakText = (text, targetLang) => {
            if (!voiceEnabled || !('speechSynthesis' in window)) return;

            window.speechSynthesis.cancel(); // stop any previous speech

            // Strip markdown asterisks and bullets for smooth reading
            const cleanText = text
                  .replace(/\*\*/g, '')
                  .replace(/[•#_*]/g, '')
                  .replace(/\n+/g, '. ');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            const currentLang = targetLang || language;
            utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = currentLang === 'hi' ? 0.95 : 1.05;
            utterance.pitch = 1.0;

            // Try to find a matching native voice
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                  if (currentLang === 'hi') {
                        const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
                        if (hiVoice) utterance.voice = hiVoice;
                  } else {
                        const enVoice = voices.find(v => v.lang.startsWith('en'));
                        if (enVoice) utterance.voice = enVoice;
                  }
            }

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
      };

      const stopSpeaking = () => {
            if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
            }
      };

      const toggleListening = () => {
            if (!recognitionRef.current) {
                  alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave on Android/Desktop.');
                  return;
            }

            if (isListening) {
                  recognitionRef.current.stop();
            } else {
                  try {
                        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
                        recognitionRef.current.start();
                  } catch (e) {
                        console.error('Could not start recognition:', e);
                  }
            }
      };

      const handleSend = async (messageText) => {
            const query = (messageText || inputText).trim();
            if (!query || loading) return;

            const lower = query.toLowerCase();

            // Stream selection voice/chat intercept
            if (lower.includes('business') || lower.includes('बिजनेस') || lower.includes('mba') || lower.includes('मैनेजमेंट') || lower.includes('sales')) {
                  const userMsg = { sender: 'user', text: query, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleSelectStream('business');
                  return;
            }
            if (lower.includes('tech') || lower.includes('टेक') || lower.includes('developer') || lower.includes('coding') || lower.includes('सॉफ्टवेयर') || lower.includes('इंजीनियरिंग')) {
                  const userMsg = { sender: 'user', text: query, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleSelectStream('tech');
                  return;
            }

            // Language switch voice/chat intercept
            if (lower.includes('switch to hindi') || lower.includes('हिंदी में बोलो') || lower.includes('hindi please') || lower === 'हिंदी' || lower === 'hindi') {
                  const userMsg = { sender: 'user', text: query, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleLanguageChange('hi');
                  return;
            }
            if (lower.includes('switch to english') || lower.includes('speak english') || lower.includes('english please') || lower === 'english') {
                  const userMsg = { sender: 'user', text: query, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleLanguageChange('en');
                  return;
            }

            const userMsg = {
                  sender: 'user',
                  text: query,
                  timestamp: new Date()
            };

            setMessages((prev) => [...prev, userMsg]);
            setInputText('');
            setLoading(true);

            const activeLang = language;

            try {
                  const response = await axios.post(
                        `${config.API_BASE_URL}/ai/chat-assist`,
                        { message: query, language: activeLang },
                        { timeout: 8000 }
                  );

                  const aiReply = response.data.reply;
                  const aiMsg = {
                        sender: 'ai',
                        text: aiReply,
                        suggestions: response.data.suggestions || [],
                        timestamp: new Date()
                  };

                  setMessages((prev) => [...prev, aiMsg]);
                  speakText(aiReply, activeLang);
            } catch (error) {
                  const fallbacks = MESSAGES_BY_LANG[activeLang];
                  let fallbackReply = fallbacks.fallbackDefault;

                  if (query.toLowerCase().includes('verb') || query.toLowerCase().includes('action') || query.includes('वर्ब')) {
                        fallbackReply = fallbacks.fallbackVerbs;
                  } else if (query.toLowerCase().includes('summary') || query.includes('समरी')) {
                        fallbackReply = fallbacks.fallbackSummary;
                  }

                  const aiMsg = {
                        sender: 'ai',
                        text: fallbackReply,
                        timestamp: new Date()
                  };
                  setMessages((prev) => [...prev, aiMsg]);
                  speakText(fallbackReply, activeLang);
            } finally {
                  setLoading(false);
            }
      };

      const langConfig = MESSAGES_BY_LANG[language] || MESSAGES_BY_LANG.en;

      return (
            <div className="ai-chat-assistant-root">
                  {/* Floating Trigger Button */}
                  {!isOpen && (
                        <button
                              className="ai-chat-trigger-btn"
                              onClick={() => setIsOpen(true)}
                              title="Ask AI Career Coach"
                              aria-label="Open AI Career Assistant"
                        >
                              <span className="trigger-icon">🤖</span>
                              <span className="trigger-label">{language === 'hi' ? 'AI कोच 🎙️' : 'AI Coach 🎙️'}</span>
                              <span className="trigger-pulse-ring"></span>
                        </button>
                  )}

                  {/* Chat Window */}
                  {isOpen && (
                        <div className="ai-chat-window fade-in">
                              {/* Header */}
                              <div className="ai-chat-header">
                                    <div className="ai-chat-header-info">
                                          <div className="ai-status-indicator online"></div>
                                          <div>
                                                <h4>LokiAI Career Coach</h4>
                                                <p className="ai-subtitle">Voice &amp; ATS Assistant</p>
                                          </div>
                                    </div>

                                    <div className="ai-header-controls">
                                           {/* Stream Track Switcher */}
                                           <button
                                                 type="button"
                                                 className="lang-pill track-pill"
                                                 onClick={() => handleSelectStream(studentTrack === 'business' ? 'tech' : 'business')}
                                                 title={language === 'hi' ? 'ट्रैक बदलें (Tech / Business)' : 'Switch Stream (Tech / Business)'}
                                           >
                                                 {studentTrack === 'business' ? '💼 Biz' : '💻 Tech'}
                                           </button>

                                           {/* Language Selector Switcher */}
                                          <div className="ai-lang-switcher" title="Select Voice & Chat Language">
                                                <button
                                                      type="button"
                                                      className={`lang-pill ${language === 'hi' ? 'active' : ''}`}
                                                      onClick={() => handleLanguageChange('hi')}
                                                >
                                                      🇮🇳 हिं
                                                </button>
                                                <button
                                                      type="button"
                                                      className={`lang-pill ${language === 'en' ? 'active' : ''}`}
                                                      onClick={() => handleLanguageChange('en')}
                                                >
                                                      🇺🇸 En
                                                </button>
                                          </div>

                                          {/* Step-by-Step Guide Trigger */}
                                          <button
                                                type="button"
                                                className="ai-icon-btn guide-btn"
                                                onClick={() => triggerVoiceGuide('', language)}
                                                title={language === 'hi' ? 'स्टेप-बाय-स्टेप गाइड सुनें' : 'Restart Voice Guide'}
                                          >
                                                🎙️ {language === 'hi' ? 'गाइड' : 'Guide'}
                                          </button>

                                          {isSpeaking && (
                                                <button
                                                      className="ai-icon-btn active-voice"
                                                      onClick={stopSpeaking}
                                                      title="Stop Voice Playback"
                                                >
                                                      🔊 Stop
                                                </button>
                                          )}
                                          <button
                                                className={`ai-icon-btn ${voiceEnabled ? 'voice-on' : 'voice-off'}`}
                                                onClick={() => {
                                                      if (isSpeaking) stopSpeaking();
                                                      setVoiceEnabled(!voiceEnabled);
                                                }}
                                                title={voiceEnabled ? 'Voice output ON (Click to mute)' : 'Voice output OFF'}
                                          >
                                                {voiceEnabled ? '🔊' : '🔇'}
                                          </button>
                                          <button
                                                className="ai-icon-btn close-btn"
                                                onClick={() => {
                                                      stopSpeaking();
                                                      setIsOpen(false);
                                                }}
                                                title="Close Chat"
                                          >
                                                ✕
                                          </button>
                                    </div>
                              </div>

                              {/* Message History */}
                              <div className="ai-chat-body">
                                    {messages.map((m, idx) => (
                                          <div key={idx} className={`ai-message-row ${m.sender} ${m.isGuide ? 'guide-message' : ''}`}>
                                                {m.sender === 'ai' && <div className="ai-msg-avatar">🤖</div>}
                                                <div className="ai-msg-bubble">
                                                      {m.isGuide && (
                                                            <div className="guide-indicator-badge">
                                                                  <span>🌟 {language === 'hi' ? 'स्टेप-बाय-स्टेप 90%+ ATS गाइड' : 'Step-by-Step ATS Guide'}</span>
                                                            </div>
                                                      )}
                                                      <div className="ai-msg-text">
                                                            {m.text.split('\n').map((line, lIdx) => (
                                                                  <p key={lIdx} style={{ margin: line ? '4px 0' : '8px 0' }}>
                                                                        {line}
                                                                  </p>
                                                            ))}
                                                      </div>
                                                      {m.isStreamPrompt && (
                                                            <div className="stream-prompt-cards">
                                                                  <button
                                                                        type="button"
                                                                        className={`stream-choice-card ${studentTrack === 'tech' ? 'selected' : ''}`}
                                                                        onClick={() => handleSelectStream('tech')}
                                                                  >
                                                                        <span className="choice-icon">💻</span>
                                                                        <div className="choice-info">
                                                                              <span className="choice-title">Tech / Developer</span>
                                                                              <span className="choice-desc">{language === 'hi' ? 'LeetCode, GitHub, कोडिंग प्रोजेक्ट्स' : 'LeetCode, GitHub, Coding Projects'}</span>
                                                                        </div>
                                                                        {studentTrack === 'tech' && <span className="choice-check">✓</span>}
                                                                  </button>
                                                                  <button
                                                                        type="button"
                                                                        className={`stream-choice-card ${studentTrack === 'business' ? 'selected' : ''}`}
                                                                        onClick={() => handleSelectStream('business')}
                                                                  >
                                                                        <span className="choice-icon">💼</span>
                                                                        <div className="choice-info">
                                                                              <span className="choice-title">Business / Executive</span>
                                                                              <span className="choice-desc">{language === 'hi' ? 'Michael Scott 2-कॉलम, रेफरेंसेज, मैनेजमेंट' : '2-Col Executive, References, Management'}</span>
                                                                        </div>
                                                                        {studentTrack === 'business' && <span className="choice-check">✓</span>}
                                                                  </button>
                                                            </div>
                                                      )}
                                                      {m.sender === 'ai' && (
                                                            <button
                                                                  className="read-aloud-btn"
                                                                  onClick={() => speakText(m.speech || m.text, language)}
                                                                  title={language === 'hi' ? 'आवाज में सुनें' : 'Read answer aloud'}
                                                            >
                                                                  🔊 {language === 'hi' ? 'आवाज़ सुनें' : 'Listen Voice'}
                                                            </button>
                                                      )}
                                                      {m.suggestions && m.suggestions.length > 0 && (
                                                            <div className="msg-inline-chips">
                                                                  {m.suggestions.map((sug, sIdx) => (
                                                                        <button
                                                                              key={sIdx}
                                                                              className="msg-chip"
                                                                              onClick={() => handleSend(sug)}
                                                                        >
                                                                              {sug}
                                                                        </button>
                                                                  ))}
                                                            </div>
                                                      )}
                                                </div>
                                          </div>
                                    ))}

                                    {loading && (
                                          <div className="ai-message-row ai">
                                                <div className="ai-msg-avatar">🤖</div>
                                                <div className="ai-msg-bubble typing-bubble">
                                                      <span className="typing-dot"></span>
                                                      <span className="typing-dot"></span>
                                                      <span className="typing-dot"></span>
                                                </div>
                                          </div>
                                    )}

                                    <div ref={messagesEndRef} />
                              </div>

                              {/* Quick Suggestions Chips */}
                              <div className="ai-prompt-chips">
                                    {((studentTrack === 'business' ? langConfig.chipsBusiness : langConfig.chipsTech) || []).map((chip, cIdx) => (
                                          <button
                                                key={cIdx}
                                                className="chip-btn"
                                                onClick={() => handleSend(chip)}
                                          >
                                                {chip}
                                          </button>
                                    ))}
                              </div>

                              {/* Active Listening Indicator */}
                              {isListening && (
                                    <div className="voice-listening-banner">
                                          <span className="mic-pulse-anim">🎙️</span>
                                          <span>{langConfig.listening}</span>
                                    </div>
                              )}

                              {/* Input Box */}
                              <form
                                    className="ai-chat-footer"
                                    onSubmit={(e) => {
                                          e.preventDefault();
                                          handleSend();
                                    }}
                              >
                                    <button
                                          type="button"
                                          className={`ai-mic-btn ${isListening ? 'listening' : ''}`}
                                          onClick={toggleListening}
                                          title={isListening ? 'Stop Listening' : (language === 'hi' ? 'हिंदी में बोलें' : 'Speak in English')}
                                    >
                                          🎙️
                                    </button>
                                    <input
                                          type="text"
                                          value={inputText}
                                          onChange={(e) => setInputText(e.target.value)}
                                          placeholder={isListening ? langConfig.listening : langConfig.placeholder}
                                          className="ai-chat-input"
                                    />
                                    <button
                                          type="submit"
                                          disabled={loading || !inputText.trim()}
                                          className="ai-send-btn"
                                          title="Send Message"
                                    >
                                          ➤
                                    </button>
                              </form>
                        </div>
                  )}
            </div>
      );
}

export default AIChatAssistant;

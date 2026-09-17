import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import '../styles/AIChatAssistant.css';

const MESSAGES_BY_LANG = {
      hi: {
            welcome: "👋 नमस्ते! मैं आपका **CVNex AI करियर और ATS कोच** हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• 🎯 अपना ATS स्कोर 90%+ तक ले जाने में\n• ✍️ Google XYZ फॉर्मूला से असरदार बुलेट पॉइंट्स लिखने में\n• 💼 Tech और Business दोनों के लिए कस्टमाइज्ड टूल्स\n• 🎙️ आप नीचे दिए गए माइक बटन को दबाकर हिंदी में बोलकर भी सवाल पूछ सकते हैं!",
            placeholder: "माइक 🎙️ दबाकर बोलें या सवाल टाइप करें...",
            listening: "सुन रहा हूँ... अब बोलिए (हिंदी या इंग्लिश)",
            chipsTech: [
                  "⚠️ गलतियाँ चेक करें (Audit Mistakes)",
                  "🚀 शुरुआत कैसे करें? (गाइड)",
                  "🎯 ATS स्कोर 90%+ कैसे करें?",
                  "✍️ सॉफ्टवेयर इंजीनियर की समरी लिखो",
                  "💡 5 दमदार एक्शन वर्ब्स",
                  "🛡️ LeetCode और GitHub प्रोफाइल्स"
            ],
            chipsBusiness: [
                  "⚠️ गलतियाँ चेक करें (Audit Mistakes)",
                  "💼 बिजनेस समरी कैसे लिखें?",
                  "🎯 ATS स्कोर 90%+ कैसे करें?",
                  "🤝 रेफरेंसेज (References) कैसे जोड़ें?",
                  "📊 टॉप 10 बिजनेस स्किल्स",
                  "🌟 Michael Scott टेम्पलेट कैसे इस्तेमाल करें?"
            ],
            fallbackDefault: "ATS स्कोर 90%+ करने के लिए अपने हर प्रोजेक्ट में संख्या (Numbers) जोड़ें और जॉब पोस्टिंग से 10+ मुख्य स्किल्स शामिल करें!",
            fallbackVerbs: "पावरफुल वर्ब्स का उपयोग करें: Architected, Spearheaded, Automated, Engineered, Streamlined. 'Worked on' जैसे कमज़ोर शब्द न लिखें।",
            fallbackSummary: "समरी फॉर्मूला: [अनुभव के वर्ष / रोल] + [प्रमुख टेक्नोलॉजीज़ या बिजनेस डोमेन] + [ठोस उपलब्धि]। 40 से 80 शब्दों में रखें।"
      },
      en: {
            welcome: "👋 Hi! I'm your **CVNex AI Career & ATS Coach**.\n\nI can help you:\n• 🎯 Optimize your ATS Score to 90%+\n• ✍️ Write high-impact bullet points with numbers\n• 💼 Tailor tools for Tech & Business students\n• 🎙️ You can also speak to me in English using the microphone button!",
            placeholder: "Speak with mic 🎙️ or type your question...",
            listening: "Listening... Speak your question now",
            chipsTech: [
                  "⚠️ Check Resume Mistakes (Audit)",
                  "🚀 How to get started? (Guide)",
                  "🎯 How to get 90%+ ATS Score?",
                  "✍️ Write summary for Full Stack Engineer",
                  "💡 5 high-impact action verbs",
                  "🛡️ LeetCode & GitHub profile tips"
            ],
            chipsBusiness: [
                  "⚠️ Check Resume Mistakes (Audit)",
                  "💼 How to write Executive Summary?",
                  "🎯 How to get 90%+ ATS Score?",
                  "🤝 How to format References properly?",
                  "📊 Top 10 Business & Management Skills",
                  "🌟 How to use Michael Scott Executive template?"
            ],
            fallbackDefault: "Quantify your achievements with numbers (e.g. 'reduced costs by 25%' or 'improved latency by 40%') and match 10+ core keywords for a 90%+ ATS score!",
            fallbackVerbs: "Use power verbs: Spearheaded, Negotiated, Optimized, Streamlined, Orchestrated, and Engineered. Avoid generic terms like 'worked on'.",
            fallbackSummary: "Summary Formula: [Years of Experience / Role] + [Key Business or Tech Domain] + [Proven High-Impact Metric]. Keep it between 40-90 words."
      }
};

const generateOnboardingGuide = (userName, targetLang, track = 'tech') => {
      const isHi = targetLang === 'hi';
      const cleanName = userName ? userName.trim().split(' ')[0] : '';
      const isBiz = (track || '').toLowerCase() === 'business';
      const salutation = cleanName ? (isHi ? `नमस्ते ${cleanName}!` : `Welcome ${cleanName}!`) : (isHi ? 'नमस्ते!' : 'Welcome!');

      if (isBiz) {
            if (isHi) {
                  return {
                        text: `👋 **${salutation} CVNex बिजनेस व एग्जीक्यूटिव ट्रैक में आपका स्वागत है।** 💼\n\nआइए मिलकर आपका बिजनेस रेज़्युमे **90%+ ATS स्कोर** वाला बनाएं! यहाँ आपके लिए 4 सबसे महत्वपूर्ण नियम हैं:\n\n1. 📊 **P&L व रेवेन्यू आंकड़े (Experience)**: वर्क एक्सपीरियंस में आंकड़े ज़रूर लिखें—जैसे 'सालाना सेल्स 35% बढ़ाई', '$1.5M बजट मैनेज किया' या 'क्लाइंट रिटेंशन 98% पहुंचाया'।\n2. 📝 **एग्जीक्यूटिव समरी**: 50-80 शब्दों की लीडरशिप समरी लिखें जिसमें आपकी इंडस्ट्री, टीम लीडरशिप और मुख्य उपलब्धि दर्ज हो।\n3. 💼 **बिजनेस व मैनेजमेंट स्किल्स**: स्टेप 4 में स्ट्रैटेजिक प्लानिंग, P&L, सेल्स नेगोशिएशन, CRM और बजटिंग जैसी 10-12 मुख्य स्किल्स जोड़ें।\n4. 🤝 **रेफरेंसेस व भाषाएं**: स्टेप 5 में प्रोफेशनल रेफरेंसेस और स्टेप 9 में स्पोकन भाषाएं जोड़कर अपने प्रोफाइल को कॉर्पोरेट लीडर्स के लिए तैयार करें!\n\n🎙️ आप नीचे माइक दबाकर बिजनेस रेज़्युमे या इंटरव्यू के सवाल सीधे हिंदी में पूछ सकते हैं!`,
                        speech: `${salutation} CVNex के बिजनेस व एग्जीक्यूटिव ट्रैक में आपका स्वागत है। बिजनेस रेज़्युमे में 90%+ ATS स्कोर पाने के लिए: पहले, वर्क एक्सपीरियंस में P&L और रेवेन्यू के आंकड़े जैसे 35% सेल्स ग्रोथ अवश्य लिखें। दूसरे, समरी में टीम लीडरशिप का जिक्र करें। तीसरे, स्टेप 4 में बिजनेस स्किल्स, स्टेप 5 में प्रोफेशनल रेफरेंसेस और स्टेप 9 में भाषाएं जोड़ें। आप मुझसे कोई भी सवाल पूछ सकते हैं!`
                  };
            } else {
                  return {
                        text: `👋 **${salutation} Welcome to CVNex Business & Executive Track!** 💼\n\nLet's build a **90%+ ATS Executive Resume** that wins corporate interviews! Here are your 4 essential steps:\n\n1. 📊 **Quantify Business Impact**: In Work Experience, always include P&L figures, revenue growth % (e.g. 'boosted sales by 35%'), or budget sizes.\n2. 📝 **Executive Summary**: Add a 50-80 word leadership summary highlighting your industry domain and key career wins.\n3. 💼 **10-12 Business Skills**: In Step 4, add Strategic Planning, P&L Management, CRM, Team Leadership, and Budgeting.\n4. 🤝 **References & Languages**: Add corporate references in Step 5 and spoken languages in Step 9 to impress hiring managers!\n\n🎙️ Ask me anything anytime using the mic button or chat!`,
                        speech: `${salutation} Welcome to CVNex Business and Executive track! To achieve a 90%+ ATS score: First, quantify your experience with revenue and P&L metrics like 35% sales growth. Second, highlight team leadership in your summary. Third, include corporate references in Step 5 and spoken languages in Step 9. Let's create your executive resume!`
                  };
            }
      } else {
            // Tech Track
            if (isHi) {
                  return {
                        text: `👋 **${salutation} CVNex टेक व सॉफ्टवेयर डेवलपर ट्रैक में आपका स्वागत है।** 💻\n\nआइए मिलकर आपका टेक रेज़्युमे **90%+ ATS स्कोर** वाला बनाएं! यहाँ आपके लिए 4 सबसे महत्वपूर्ण नियम हैं:\n\n1. 💻 **कोर टेक स्टैक**: स्टेप 4 में अपनी मुख्य प्रोग्रामिंग लैंग्वेजेस और टूल्स (React, Python, Docker, AWS) जोड़ें।\n2. 🛡️ **LeetCode और GitHub लिंक्स**: स्टेप 1 में अपने एक्टिव कोडिंग प्रोफाइल्स और GitHub प्रोजेक्ट लिंक्स अवश्य जोड़ें।\n3. 🚀 **प्रोजेक्ट्स में सिस्टम आंकड़े**: प्रोजेक्ट्स में Google XYZ फॉर्मूले से लिखें (जैसे: 'API लेटेंसी 40% कम की', '10,000+ यूज़र्स')।\n4. 🎯 **ATS Job Matcher**: अपनी टारगेट जॉब डिस्क्रिप्शन पेस्ट करके मिसिंग टेक्निकल कीवर्ड्स तुरंत चेक करें!\n\n🎙️ आप नीचे माइक दबाकर मुझसे कोडिंग या रेज़्युमे पर कोई भी सवाल सीधे हिंदी में पूछ सकते हैं!`,
                        speech: `${salutation} CVNex के टेक व सॉफ्टवेयर डेवलपर ट्रैक में आपका स्वागत है। टेक रेज़्युमे में 90%+ ATS स्कोर पाने के लिए: पहले, स्टेप 4 में अपने कोर टेक स्टैक जोड़ें। दूसरे, LeetCode और GitHub प्रोफाइल्स लिंक करें। तीसरे, प्रोजेक्ट्स में लेटेंसी और स्केल के आंकड़े लिखें। चलिए आपका डेवलपर रेज़्युमे तैयार करते हैं!`
                  };
            } else {
                  return {
                        text: `👋 **${salutation} Welcome to CVNex Tech & Developer Track!** 💻\n\nLet's build a **90%+ ATS Engineering Resume** that gets you shortlisted! Here are your 4 essential steps:\n\n1. 💻 **Core Tech Stack**: In Step 4, list your core languages and frameworks (React, Node.js, Python, Docker, AWS).\n2. 🛡️ **LeetCode & GitHub**: Add your live GitHub projects and LeetCode problem-solving profiles in Step 1.\n3. 🚀 **System Impact & Metrics**: Quantify your project achievements (e.g. 'reduced latency by 42%', '10k+ daily users').\n4. 🎯 **ATS Job Matcher**: Paste target job descriptions into the ATS Analyzer to identify missing engineering keywords!\n\n🎙️ Ask me anything anytime using the mic button or chat!`,
                        speech: `${salutation} Welcome to CVNex Tech and Developer track! To achieve a 90%+ ATS score: First, add your core tech stack in Step 4. Second, link your GitHub and LeetCode profiles in Step 1. Third, quantify your project impact with numbers like 40% latency reduction. Let's build your developer resume!`
                  };
            }
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
      const [speakingIdx, setSpeakingIdx] = useState(null);
      const [voiceEnabled, setVoiceEnabled] = useState(true);

      const messagesEndRef = useRef(null);
      const recognitionRef = useRef(null);
      const voicesRef = useRef([]);
      const speakHeartbeatRef = useRef(null);

      // Preload SpeechSynthesis Voices
      useEffect(() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  const updateVoices = () => {
                        try {
                              const v = window.speechSynthesis.getVoices();
                              if (v && v.length > 0) {
                                    voicesRef.current = v;
                              }
                        } catch (e) {}
                  };
                  updateVoices();
                  window.speechSynthesis.onvoiceschanged = updateVoices;
            }
      }, []);

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
                        ? "👋 **नमस्ते! CVNex में आपका स्वागत है।** 🎓\n\nआप अपना रेज़्युमे किस स्ट्रीम के लिए बनाना चाहते हैं?\n• 💻 **Tech Student / Developer**: LeetCode, GitHub, कोड प्रोजेक्ट्स, टेक्निकल स्किल्स\n• 💼 **Business Student / Executive**: Michael Scott 2-कॉलम लेआउट, रेफरेंसेज, मैनेजमेंट स्किल्स\n\nनीचे दिए गए विकल्प को चुनें या बोलकर बताएं (जैसे: 'Business' या 'Tech')!"
                        : "👋 **Welcome to CVNex!** 🎓\n\nWhich stream are you building your resume for?\n• 💻 **Tech Student / Developer**: LeetCode, GitHub, coding projects, tech stacks\n• 💼 **Business Student / Executive**: 2-Column Executive layout, References, Hobbies, P&L skills\n\nTap an option below or speak your choice (e.g. 'Business' or 'Tech')!",
                  speech: isHi
                        ? "नमस्ते! CVNex में आपका स्वागत है। क्या आप बिजनेस के छात्र हैं या टेक के छात्र हैं? नीचे दिए गए विकल्प पर टैप करें या बोलकर बताएं।"
                        : "Welcome to CVNex! Are you a Business student or a Tech student? Please tap an option below or speak your choice.",
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
      // Trigger Onboarding Voice & Chat Guide with stream awareness
      const triggerVoiceGuide = (userName, targetLang, chosenTrack) => {
            const currentLang = targetLang || language;
            const activeTrack = chosenTrack || studentTrack || (user && user.track) || 'tech';
            const guide = generateOnboardingGuide(userName, currentLang, activeTrack);
            const isBiz = activeTrack === 'business';

            setIsOpen(true);
            const guideMsg = {
                  sender: 'ai',
                  text: guide.text,
                  speech: guide.speech,
                  isGuide: true,
                  suggestions: isBiz ? (currentLang === 'hi' ? [
                        "📊 Business Resume में 90%+ ATS स्कोर कैसे पाएं?",
                        "💼 Michael Scott 2-कॉलम टेम्पलेट कैसे इस्तेमाल करें?",
                        "📝 P&L और Sales Metrics कैसे लिखें?",
                        "🤝 References Section में क्या भरें?"
                  ] : [
                        "📊 How to get 90%+ ATS score for Business?",
                        "💼 How to use Michael Scott 2-Column Template?",
                        "📝 How to write P&L and Sales Metrics?",
                        "🤝 What to put in References Section?"
                  ]) : (currentLang === 'hi' ? [
                        "🎯 Tech Resume में 90%+ ATS स्कोर कैसे पाएं?",
                        "💡 Google XYZ फॉर्मूला क्या है?",
                        "🛡️ LeetCode और GitHub Links कैसे जोड़ें?",
                        "🔍 ATS Job Matcher कैसे इस्तेमाल करें?"
                  ] : [
                        "🎯 How to get 90%+ ATS Score for Tech?",
                        "💡 What is Google XYZ formula?",
                        "🛡️ How to link GitHub & LeetCode?",
                        "🔍 How to use ATS Job Matcher?"
                  ]),
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
                  const userName = e.detail?.name || (user && user.name) || '';
                  const trackFromEvent = e.detail?.track || studentTrack || (user && user.track) || 'tech';
                  triggerVoiceGuide(userName, language, trackFromEvent);
            };

            const handleStreamWelcomeEvent = (e) => {
                  const trackFromEvent = e.detail?.track || studentTrack || 'tech';
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
                              triggerVoiceGuide(parsed.name, language, parsed.track || studentTrack);
                        }, 800);
                  } catch (e) {
                        sessionStorage.removeItem('loku_ai_guide_trigger');
                  }
            }

            return () => {
                  window.removeEventListener('trigger-loku-ai-guide', handleGuideEvent);
                  window.removeEventListener('trigger-stream-welcome', handleStreamWelcomeEvent);
            };
      }, [language, studentTrack, user]);

      // Text-to-Speech Audio Playback with voice selection
      // Text-to-Speech Audio Playback with voice selection and heartbeat
      const stopSpeaking = () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
            }
            if (speakHeartbeatRef.current) {
                  clearInterval(speakHeartbeatRef.current);
                  speakHeartbeatRef.current = null;
            }
            setIsSpeaking(false);
            setSpeakingIdx(null);
      };

      const speakText = (text, targetLang, msgIndex = null) => {
            if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

            try {
                  stopSpeaking(); // stop any previous speech cleanly

                  // Strip markdown asterisks, hashes, brackets and bullets for natural audio reading
                  const cleanText = text
                        .replace(/\*\*/g, '')
                        .replace(/[•#_*`]/g, '')
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        .replace(/\n+/g, '. ')
                        .replace(/\s+/g, ' ')
                        .trim();

                  if (!cleanText) return;

                  const utterance = new SpeechSynthesisUtterance(cleanText);
                  const currentLang = targetLang || language;
                  utterance.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
                  utterance.rate = currentLang === 'hi' ? 0.95 : 1.02;
                  utterance.pitch = 1.0;

                  // Try to find a matching native voice using cached or live voices
                  let voices = voicesRef.current;
                  if (!voices || voices.length === 0) {
                        voices = window.speechSynthesis.getVoices();
                        voicesRef.current = voices;
                  }

                  if (voices && voices.length > 0) {
                        if (currentLang === 'hi') {
                              const hiVoice = voices.find(v => (v.lang && (v.lang.startsWith('hi') || v.lang.includes('IN'))) && v.name.toLowerCase().includes('hindi'))
                                           || voices.find(v => v.lang && v.lang.startsWith('hi'))
                                           || voices.find(v => v.name.toLowerCase().includes('hindi'));
                              if (hiVoice) utterance.voice = hiVoice;
                        } else {
                              const enVoice = voices.find(v => v.lang && (v.lang === 'en-US' || v.lang === 'en-GB'))
                                           || voices.find(v => v.lang && v.lang.startsWith('en'));
                              if (enVoice) utterance.voice = enVoice;
                        }
                  }

                  utterance.onstart = () => {
                        setIsSpeaking(true);
                        setSpeakingIdx(msgIndex !== null ? msgIndex : null);
                        // Heartbeat to prevent browser audio pause bug during long sentences
                        if (speakHeartbeatRef.current) clearInterval(speakHeartbeatRef.current);
                        speakHeartbeatRef.current = setInterval(() => {
                              if (window.speechSynthesis && window.speechSynthesis.speaking) {
                                    window.speechSynthesis.pause();
                                    window.speechSynthesis.resume();
                              } else {
                                    stopSpeaking();
                              }
                        }, 9000);
                  };

                  utterance.onend = () => {
                        stopSpeaking();
                  };

                  utterance.onerror = (e) => {
                        console.warn('Speech synthesis ended:', e);
                        stopSpeaking();
                  };

                  setTimeout(() => {
                        try {
                              window.speechSynthesis.speak(utterance);
                        } catch (err) {
                              stopSpeaking();
                        }
                  }, 50);
            } catch (err) {
                  console.warn('Speech error:', err);
                  stopSpeaking();
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
            const rawText = (messageText || inputText).trim();
            if (!rawText || loading) return;

            // Clean leading emojis and bullet symbols for clean processing
            const cleanText = rawText.replace(/^[\p{Emoji}\s•💡⚠️🚀✍️🛡️💼🤝📊🌟🎯]+/u, '').trim();
            const query = cleanText || rawText;
            const lower = query.toLowerCase();

            // Stream selection voice/chat intercept
            if (lower.includes('business') || lower.includes('बिजनेस') || lower.includes('mba') || lower.includes('मैनेजमेंट') || lower.includes('sales')) {
                  const userMsg = { sender: 'user', text: rawText, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleSelectStream('business');
                  return;
            }
            if (lower.includes('tech') || lower.includes('टेक') || lower.includes('developer') || lower.includes('coding') || lower.includes('सॉफ्टवेयर') || lower.includes('इंजीनियरिंग')) {
                  const userMsg = { sender: 'user', text: rawText, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleSelectStream('tech');
                  return;
            }

            // Language switch voice/chat intercept
            if (lower.includes('switch to hindi') || lower.includes('हिंदी में बोलो') || lower.includes('hindi please') || lower === 'हिंदी' || lower === 'hindi') {
                  const userMsg = { sender: 'user', text: rawText, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleLanguageChange('hi');
                  return;
            }
            if (lower.includes('switch to english') || lower.includes('speak english') || lower.includes('english please') || lower === 'english') {
                  const userMsg = { sender: 'user', text: rawText, timestamp: new Date() };
                  setMessages((prev) => [...prev, userMsg]);
                  setInputText('');
                  handleLanguageChange('en');
                  return;
            }

            // Check if query is asking to audit or check mistakes
            if (lower.includes('mistake') || lower.includes('galti') || lower.includes('galat') || lower.includes('audit') || lower.includes('kami') || lower.includes('check resume') || lower.includes('गलतियाँ') || lower.includes('गलती')) {
                  window.dispatchEvent(new CustomEvent('trigger-resume-audit'));
            }

            const userMsg = {
                  sender: 'user',
                  text: rawText,
                  timestamp: new Date()
            };

            setMessages((prev) => [...prev, userMsg]);
            setInputText('');
            setLoading(true);

            const activeLang = language;

            try {
                  const response = await axios.post(
                        `${config.API_BASE_URL}/ai/chat-assist`,
                        { message: query, language: activeLang, track: studentTrack || 'tech' },
                        { timeout: 9000 }
                  );

                  const aiReply = response.data.reply;
                  const aiSpeech = response.data.speech || aiReply;
                  const aiMsg = {
                        sender: 'ai',
                        text: aiReply,
                        speech: aiSpeech,
                        suggestions: response.data.suggestions || [],
                        timestamp: new Date()
                  };

                  setMessages((prev) => {
                        const newMsgs = [...prev, aiMsg];
                        const newIdx = newMsgs.length - 1;
                        setTimeout(() => speakText(aiSpeech, activeLang, newIdx), 60);
                        return newMsgs;
                  });
            } catch (error) {
                  const isBiz = (studentTrack || '').toLowerCase() === 'business';
                  const isHi = activeLang === 'hi';
                  let fallbackReply = "";
                  let fallbackSpeech = "";

                  if (query.includes('वर्ब') || query.includes('एक्शन') || lower.includes('verb') || lower.includes('action')) {
                        if (isBiz) {
                              fallbackReply = isHi
                                    ? "💼 **बिजनेस एक्शन वर्ब्स**: Spearheaded (नेतृत्व किया), Negotiated (सौदा क्लोज किया), Optimized (प्रॉफिट सुधारा), Expanded (विस्तार किया), Orchestrated (टीम संचालन किया)।"
                                    : "💼 **Business Action Verbs**: Spearheaded, Negotiated, Optimized, Expanded, and Orchestrated.";
                              fallbackSpeech = isHi
                                    ? "बिजनेस के लिए 5 एक्शन वर्ब्स हैं: Spearheaded, Negotiated, Optimized, Expanded, और Orchestrated."
                                    : "Top executive verbs are Spearheaded, Negotiated, Optimized, and Orchestrated.";
                        } else {
                              fallbackReply = isHi
                                    ? "💻 **टेक एक्शन वर्ब्स**: Architected (सिस्टम डिज़ाइन किया), Spearheaded (माइग्रेशन लीड किया), Automated (CI/CD ऑटोमेशन), Engineered (APIs बनाईं), Scaled (लेटेंसी कम की)।"
                                    : "💻 **Tech Action Verbs**: Architected, Spearheaded, Automated, Engineered, and Scaled.";
                              fallbackSpeech = isHi
                                    ? "टेक के लिए 5 एक्शन वर्ब्स हैं: Architected, Spearheaded, Automated, Engineered, और Scaled."
                                    : "Top technical action verbs are Architected, Spearheaded, Automated, Engineered, and Scaled.";
                        }
                  } else if (query.includes('समरी') || lower.includes('summary')) {
                        if (isBiz) {
                              fallbackReply = isHi
                                    ? "👔 **बिजनेस एग्जीक्यूटिव समरी**: 'परिणाम-उन्मुख बिजनेस लीडर, जिन्हें P&L मैनेजमेंट, ब्रांच ऑपरेशंस और B2B सेल्स का 8+ वर्षों का अनुभव है। सालाना रेवेन्यू में 140% की वृद्धि दर्ज की।'"
                                    : "👔 **Business Executive Summary**: 'Dynamic Business Executive with 8+ years experience in P&L management, branch operations, and enterprise sales delivering 140% quota.'";
                        } else {
                              fallbackReply = isHi
                                    ? "💻 **सॉफ्टवेयर इंजीनियर समरी**: 'अनुभवी सॉफ्टवेयर इंजीनियर, जिन्हें स्केलेबल वेब ऐप्स, माइक्रोसर्विसेज और क्लाउड का 3+ वर्षों का अनुभव है। API लेटेंसी को 40% कम करने का ट्रैक रिकॉर्ड।'"
                                    : "💻 **Software Engineer Summary**: 'Innovative Software Engineer with 3+ years experience engineering microservices, reducing API latency by 40% with React, Node, and Python.'";
                        }
                  } else if (query.includes('स्कोर') || lower.includes('score') || lower.includes('ats')) {
                        if (isBiz) {
                              fallbackReply = isHi
                                    ? "🎯 **बिजनेस ATS स्कोर 90%+**: 1. P&L व 35% सेल्स ग्रोथ आंकड़े लिखें। 2. स्ट्रैटेजिक प्लानिंग व CRM स्किल्स जोड़ें। 3. Step 5 में रेफरेंसेस दें। 4. Michael Scott 2-कॉलम लेआउट चुनें।"
                                    : "🎯 **Business 90%+ ATS Score**: 1. Quantify P&L and revenue metrics. 2. Add Strategic Planning & CRM skills. 3. Include references in Step 5.";
                        } else {
                              fallbackReply = isHi
                                    ? "🎯 **टेक ATS स्कोर 90%+**: 1. Google XYZ फॉर्मूले से लेटेंसी व आंकड़े लिखें। 2. 10-15 टेक स्किल्स जोड़ें। 3. LeetCode व GitHub लिंक दें। 4. ATS मैचर टूल चलाएं।"
                                    : "🎯 **Tech 90%+ ATS Score**: 1. Use Google XYZ formula with numbers. 2. Match 10-15 core skills. 3. Add GitHub and LeetCode links.";
                        }
                  } else {
                        fallbackReply = isHi
                              ? `💡 आपके सवाल '${query}' के लिए सलाह: रेज़्युमे में प्रासंगिक कीवर्ड्स शामिल करें, उपलब्धियों में ठोस आंकड़े (Numbers/%) जोड़ें, और साफ़ लेआउट रखें ताकि ATS स्कोर 90%+ रहे!`
                              : `💡 Regarding '${query}': Include target keywords, back bullet points with quantifiable numbers (% growth/speed), and keep a clean ATS format!`;
                  }

                  fallbackSpeech = fallbackSpeech || fallbackReply;

                  const aiMsg = {
                        sender: 'ai',
                        text: fallbackReply,
                        speech: fallbackSpeech,
                        timestamp: new Date()
                  };
                  setMessages((prev) => {
                        const newMsgs = [...prev, aiMsg];
                        const newIdx = newMsgs.length - 1;
                        setTimeout(() => speakText(fallbackSpeech, activeLang, newIdx), 60);
                        return newMsgs;
                  });
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
                                                <h4>CVNex Career Coach</h4>
                                                <p className="ai-subtitle">Voice &amp; ATS Assistant</p>
                                          </div>
                                    </div>

                                    <div className="ai-header-controls">
                                          {/* Stream Track Switcher */}
                                          <button
                                                type="button"
                                                className="ai-ctrl-btn track-btn"
                                                onClick={() => handleSelectStream(studentTrack === 'business' ? 'tech' : 'business')}
                                                title={language === 'hi' ? 'स्ट्रीम बदलें (Tech / Business)' : 'Switch Stream (Tech / Business)'}
                                          >
                                                {studentTrack === 'business' ? (
                                                      <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                                            <span>Biz</span>
                                                      </>
                                                ) : (
                                                      <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                                                            <span>Tech</span>
                                                      </>
                                                )}
                                          </button>

                                          {/* Single-Click Compact Language Switcher */}
                                          <button
                                                type="button"
                                                className="ai-ctrl-btn lang-btn"
                                                onClick={() => handleLanguageChange(language === 'hi' ? 'en' : 'hi')}
                                                title={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
                                          >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                                <span>{language === 'hi' ? 'हिं' : 'EN'}</span>
                                          </button>

                                          {/* Voice Guide Trigger */}
                                          <button
                                                type="button"
                                                className="ai-ctrl-btn"
                                                onClick={() => triggerVoiceGuide('', language)}
                                                title={language === 'hi' ? 'स्टेप-बाय-स्टेप गाइड सुनें' : 'Restart Voice Guide'}
                                          >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                          </button>

                                          {/* Voice Output Toggle */}
                                          <button
                                                type="button"
                                                className={`ai-ctrl-btn ${isSpeaking ? 'speaking-active' : ''}`}
                                                onClick={() => {
                                                      if (isSpeaking) {
                                                            stopSpeaking();
                                                      } else {
                                                            setVoiceEnabled(!voiceEnabled);
                                                      }
                                                }}
                                                title={isSpeaking ? 'Stop speaking' : voiceEnabled ? 'Voice output ON (Click to mute)' : 'Voice output OFF'}
                                          >
                                                {isSpeaking ? (
                                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
                                                ) : voiceEnabled ? (
                                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                                ) : (
                                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                                                )}
                                          </button>

                                          {/* Close Chat Button */}
                                          <button
                                                type="button"
                                                className="ai-ctrl-btn close-btn"
                                                onClick={() => {
                                                      stopSpeaking();
                                                      setIsOpen(false);
                                                }}
                                                title="Close Chat"
                                          >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                                                                  className={`read-aloud-btn ${speakingIdx === idx && isSpeaking ? 'playing' : ''}`}
                                                                  onClick={() => {
                                                                        if (speakingIdx === idx && isSpeaking) {
                                                                              stopSpeaking();
                                                                        } else {
                                                                              speakText(m.speech || m.text, language, idx);
                                                                        }
                                                                  }}
                                                                  title={language === 'hi' ? 'आवाज में सुनें' : 'Read answer aloud'}
                                                            >
                                                                  {speakingIdx === idx && isSpeaking ? (
                                                                        <>⏹️ {language === 'hi' ? 'रोकें (Stop)' : 'Stop Voice'}</>
                                                                  ) : (
                                                                        <>🔊 {language === 'hi' ? 'आवाज़ सुनें' : 'Listen Voice'}</>
                                                                  )}
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
                                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    </button>
                              </form>
                        </div>
                  )}
            </div>
      );
}

export default AIChatAssistant;

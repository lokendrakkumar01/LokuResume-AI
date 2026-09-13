import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import '../styles/AIChatAssistant.css';

const MESSAGES_BY_LANG = {
      hi: {
            welcome: "👋 नमस्ते! मैं आपका **LokiResume AI करियर और ATS कोच** हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• 🎯 अपना ATS स्कोर 90%+ तक ले जाने में\n• ✍️ Google XYZ फॉर्मूला से दमदार बुलेट पॉइंट्स लिखने में\n• 💼 इंडस्ट्री की टॉप स्किल्स चुनने में\n• 🎙️ आप नीचे दिए गए माइक बटन को दबाकर हिंदी में बोलकर भी सवाल पूछ सकते हैं!",
            placeholder: "माइक 🎙️ दबाकर बोलें या सवाल टाइप करें...",
            listening: "सुन रहा हूँ... अब बोलिए (हिंदी या इंग्लिश)",
            chips: [
                  "🎯 ATS स्कोर 90%+ कैसे करें?",
                  "✍️ सॉफ्टवेयर इंजीनियर की समरी लिखो",
                  "💡 5 दमदार एक्शन वर्ब्स",
                  "🛡️ साइबर सिक्योरिटी के लिए स्किल्स",
                  "⭐ इंटरव्यू का STAR मेथड क्या है?"
            ],
            fallbackDefault: "ATS स्कोर 90%+ करने के लिए अपने हर प्रोजेक्ट में संख्या (Numbers) जोड़ें और जॉब पोस्टिंग से 10+ मुख्य स्किल्स शामिल करें!",
            fallbackVerbs: "पावरफुल वर्ब्स का उपयोग करें: Architected, Spearheaded, Automated, Engineered, Streamlined. 'Worked on' जैसे कमज़ोर शब्द न लिखें।",
            fallbackSummary: "समरी फॉर्मूला: [अनुभव के वर्ष / रोल] + [प्रमुख टेक्नोलॉजीज़] + [ठोस उपलब्धि]। 40 से 80 शब्दों में रखें।"
      },
      en: {
            welcome: "👋 Hi! I'm your **LokiResume AI Career & ATS Coach**.\n\nI can help you:\n• 🎯 Optimize your ATS Score to 90%+\n• ✍️ Write high-impact bullet points with numbers\n• 💼 Recommend in-demand tech skills\n• 🎙️ You can also speak to me in English using the microphone button!",
            placeholder: "Speak with mic 🎙️ or type your question...",
            listening: "Listening... Speak your question now",
            chips: [
                  "🎯 How to get 90%+ ATS Score?",
                  "✍️ Write summary for Full Stack Engineer",
                  "💡 5 high-impact action verbs",
                  "🛡️ Skills for Cybersecurity Analyst",
                  "⭐ What is the STAR interview method?"
            ],
            fallbackDefault: "Quantify your achievements with numbers (e.g. 'reduced latency by 40%') and match 10+ core keywords from the job description for a 90%+ ATS score!",
            fallbackVerbs: "Use power verbs: Spearheaded, Architected, Automated, Streamlined, and Engineered. Avoid generic terms like 'worked on'.",
            fallbackSummary: "Summary Formula: [Years of Experience / Role] + [Key Technologies] + [Proven High-Impact Metric]. Keep it between 40-90 words."
      }
};

function AIChatAssistant() {
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
                                          <div key={idx} className={`ai-message-row ${m.sender}`}>
                                                {m.sender === 'ai' && <div className="ai-msg-avatar">🤖</div>}
                                                <div className="ai-msg-bubble">
                                                      <div className="ai-msg-text">
                                                            {m.text.split('\n').map((line, lIdx) => (
                                                                  <p key={lIdx} style={{ margin: line ? '4px 0' : '8px 0' }}>
                                                                        {line}
                                                                  </p>
                                                            ))}
                                                      </div>
                                                      {m.sender === 'ai' && (
                                                            <button
                                                                  className="read-aloud-btn"
                                                                  onClick={() => speakText(m.text, language)}
                                                                  title={language === 'hi' ? 'आवाज में सुनें' : 'Read answer aloud'}
                                                            >
                                                                  🔊 {language === 'hi' ? 'सुनें' : 'Listen'}
                                                            </button>
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
                                    {langConfig.chips.map((chip, cIdx) => (
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

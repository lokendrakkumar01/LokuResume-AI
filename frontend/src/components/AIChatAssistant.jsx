import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import '../styles/AIChatAssistant.css';

const INITIAL_MESSAGE = {
      sender: 'ai',
      text: "👋 Hi! I'm your **LokiResume AI Career & ATS Coach**.\n\nI can help you:\n• 🎯 Optimize your ATS Score to 90%+\n• ✍️ Write high-impact bullet points with numbers\n• 💼 Recommend in-demand tech skills\n• 🎙️ You can also speak to me using the microphone button!",
      timestamp: new Date()
};

const PROMPT_CHIPS = [
      "🎯 How to get 90%+ ATS Score?",
      "✍️ Write summary for Full Stack Engineer",
      "💡 5 high-impact action verbs",
      "🛡️ Skills for Cybersecurity Analyst",
      "⭐ What is the STAR interview method?"
];

function AIChatAssistant() {
      const [isOpen, setIsOpen] = useState(false);
      const [messages, setMessages] = useState([INITIAL_MESSAGE]);
      const [inputText, setInputText] = useState('');
      const [loading, setLoading] = useState(false);
      const [isListening, setIsListening] = useState(false);
      const [isSpeaking, setIsSpeaking] = useState(false);
      const [voiceEnabled, setVoiceEnabled] = useState(true);

      const messagesEndRef = useRef(null);
      const recognitionRef = useRef(null);

      // Auto scroll to bottom of messages
      const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };

      useEffect(() => {
            if (isOpen) {
                  scrollToBottom();
            }
      }, [messages, isOpen]);

      // Setup Speech Recognition
      useEffect(() => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                  const recognition = new SpeechRecognition();
                  recognition.continuous = false;
                  recognition.interimResults = false;
                  recognition.lang = 'en-US'; // recognizes English & common Hinglish terms

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
      }, []);

      // Text-to-Speech Audio Playback
      const speakText = (text) => {
            if (!voiceEnabled || !('speechSynthesis' in window)) return;

            window.speechSynthesis.cancel(); // stop previous speech

            // Strip markdown asterisks and bullet symbols for natural reading
            const cleanText = text
                  .replace(/\*\*/g, '')
                  .replace(/[•#_*]/g, '')
                  .replace(/\n+/g, '. ');

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

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

            try {
                  const response = await axios.post(
                        `${config.API_BASE_URL}/ai/chat-assist`,
                        { message: query },
                        { timeout: 7000 }
                  );

                  const aiReply = response.data.reply;
                  const aiMsg = {
                        sender: 'ai',
                        text: aiReply,
                        suggestions: response.data.suggestions || [],
                        timestamp: new Date()
                  };

                  setMessages((prev) => [...prev, aiMsg]);
                  speakText(aiReply);
            } catch (error) {
                  // Instant intelligent client-side fallback
                  let fallbackReply = "Focus on quantifying your achievements with numbers (e.g. 'reduced latency by 40%') and matching 10+ core keywords from the job description for a 90%+ ATS score!";
                  if (query.toLowerCase().includes('verb') || query.toLowerCase().includes('action')) {
                        fallbackReply = "Use power verbs: Spearheaded, Architected, Automated, Streamlined, and Engineered. Avoid generic terms like 'helped with'.";
                  } else if (query.toLowerCase().includes('summary')) {
                        fallbackReply = "Summary Formula: [Years of Experience / Role] + [Key Technologies] + [Proven High-Impact Metric]. Keep it between 40-90 words.";
                  }

                  const aiMsg = {
                        sender: 'ai',
                        text: fallbackReply,
                        timestamp: new Date()
                  };
                  setMessages((prev) => [...prev, aiMsg]);
                  speakText(fallbackReply);
            } finally {
                  setLoading(false);
            }
      };

      return (
            <div className="ai-chat-assistant-root">
                  {/* Floating Launcher Button */}
                  {!isOpen && (
                        <button
                              className="ai-chat-trigger-btn"
                              onClick={() => setIsOpen(true)}
                              title="Ask AI Career Coach"
                              aria-label="Open AI Career Assistant"
                        >
                              <span className="trigger-icon">🤖</span>
                              <span className="trigger-label">AI Coach</span>
                              <span className="trigger-pulse-ring"></span>
                        </button>
                  )}

                  {/* Chat Drawer Window */}
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
                                                                  onClick={() => speakText(m.text)}
                                                                  title="Read answer aloud"
                                                            >
                                                                  🔊 Listen
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
                                    {PROMPT_CHIPS.map((chip, cIdx) => (
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
                                          <span>Listening... Speak your question now</span>
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
                                          title={isListening ? 'Stop Listening' : 'Speak with Voice (Hindi / English)'}
                                    >
                                          🎙️
                                    </button>
                                    <input
                                          type="text"
                                          value={inputText}
                                          onChange={(e) => setInputText(e.target.value)}
                                          placeholder={isListening ? 'Listening to your voice...' : 'Ask resume advice, skills, or ATS tips...'}
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

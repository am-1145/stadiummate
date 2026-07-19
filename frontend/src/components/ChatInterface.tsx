'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Send, Mic, MicOff, Volume2, ArrowRight, CornerDownRight, Landmark } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  route?: any; // Calculated Dijkstra Route Result if any
  timestamp: string;
}

interface ChatInterfaceProps {
  apiBase: string;
  fromNodeId?: string;
  onCalculatedRoute?: (route: any) => void;
  onEmergencyDetected?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  apiBase,
  fromNodeId,
  onCalculatedRoute,
  onEmergencyDetected
}) => {
  const { stepFreePreferred, avoidCrowdsPreferred, addAnnouncement } = useAccessibility();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Suggested quick-prompt pills (EN, ES, FR compatible)
  const suggestionPills = [
    { label: 'Nearest Accessible Toilet', text: 'Where is the nearest accessible washroom?' },
    { label: 'Evacuation Exit', text: 'Where is the nearest evacuation exit?' },
    { label: 'Bag Policy FAQ', text: 'What is the bag policy for the stadium?' },
    { label: 'Route: Metro to Sec 101', text: 'Route from MetLife Stadium Metro Station to Section 101' },
    { label: 'Sensory Quiet Room', text: 'Where is the quiet sensory room?' }
  ];

  // Set up Speech-to-Text SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsRecording(true);
          addAnnouncement("Microphone active. Start speaking.");
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
          addAnnouncement("Speech recognition failed. Please try typing.");
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }

    // Default Greeting
    setMessages([
      {
        sender: 'assistant',
        text: "Hello! I am StadiumMate, your digital companion for the FIFA World Cup 2026. How can I help you navigate the stadium safely and accessibly today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      addAnnouncement("Speech recognition is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speak
      window.speechSynthesis.cancel();
      // Remove Markdown asterisks for natural reading
      const cleanText = text.replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      window.speechSynthesis.speak(utterance);
      addAnnouncement("Reading response aloud.");
    } else {
      addAnnouncement("Text to speech is not supported in this browser.");
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          fromNodeId: fromNodeId || undefined,
          accessibilityRequired: stepFreePreferred,
          avoidCrowds: avoidCrowdsPreferred
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        const assistantMsg: ChatMessage = {
          sender: 'assistant',
          text: result.response,
          route: result.route,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, assistantMsg]);

        if (result.emergencyActivated && onEmergencyDetected) {
          onEmergencyDetected();
        }

        if (result.route && onCalculatedRoute) {
          onCalculatedRoute(result.route);
        }
      } else {
        const errorData = await response.json();
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: errorData.message || "An error occurred while contacting the stadium companion server.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "Could not establish connection to the backend server. Please verify the API status.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section 
      aria-label="Stadium Chat Companion" 
      className="glass-card rounded-2xl border border-fifa-border/40 shadow-glass flex flex-col h-[500px] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-fifa-card px-6 py-4 border-b border-fifa-border flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold font-title text-white">StadiumMate Companion</h2>
          <span className="text-[10px] text-fifa-green flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-fifa-green animate-ping" />
            Rules before LLM engine online
          </span>
        </div>
      </div>

      {/* Messages Zone */}
      <div 
        role="log" 
        aria-label="Conversation history" 
        className="flex-1 p-4 overflow-y-auto space-y-4 font-sans bg-fifa-dark/20 scrollbar"
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed transition-all shadow-md ${
                msg.sender === 'user' 
                  ? 'bg-fifa-primary text-white rounded-tr-none' 
                  : 'bg-fifa-card border border-fifa-border/50 text-fifa-text rounded-tl-none'
              }`}
            >
              {/* Message text with basic styling parser (bold fallback) */}
              <p className="whitespace-pre-line font-medium leading-relaxed">
                {msg.text}
              </p>

              {/* Render step-by-step directions if message contains calculated route */}
              {msg.route && (
                <div className="mt-4 bg-fifa-dark/60 border border-fifa-border/80 rounded-xl p-3.5 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center border-b border-fifa-border/40 pb-2 text-[10px] text-fifa-textMuted font-bold">
                    <span className="flex items-center gap-1 text-white">
                      <Landmark className="h-3 w-3 text-fifa-accent" /> Navigation Track
                    </span>
                    <span>Distance: {msg.route.totalDistance}m | Walk: {msg.route.totalDurationMinutes} mins</span>
                  </div>
                  <ol className="space-y-2 text-[11px] text-gray-300 font-sans">
                    {msg.route.directions.map((step: string, sIdx: number) => (
                      <li key={sIdx} className="flex gap-2 items-start leading-tight">
                        <CornerDownRight className="h-3.5 w-3.5 text-fifa-accent flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* TTS Speaker icon */}
              {msg.sender === 'assistant' && (
                <div className="flex justify-end mt-2 pt-1 border-t border-fifa-border/30">
                  <button
                    onClick={() => speakText(msg.text)}
                    className="p-1 rounded-md text-fifa-textMuted hover:text-white hover:bg-fifa-border/40 transition-colors focus:outline-none"
                    aria-label="Read response aloud"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            
            <span className="text-[9px] text-fifa-textMuted mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-fifa-card border border-fifa-border/50 text-fifa-text rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-fifa-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-fifa-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-fifa-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-fifa-textMuted font-semibold">Generating verified facts...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Pills */}
      <div className="bg-fifa-card/60 px-4 py-2 border-t border-fifa-border/30 flex gap-2 overflow-x-auto select-none no-scrollbar">
        {suggestionPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(pill.text)}
            className="flex-shrink-0 bg-fifa-dark/80 hover:bg-fifa-border hover:text-white border border-fifa-border/60 text-fifa-textMuted rounded-full px-3 py-1 text-[10px] font-bold transition-all focus:outline-none"
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <div className="bg-fifa-card p-4 border-t border-fifa-border flex gap-2 items-center">
        <button
          onClick={toggleRecording}
          className={`p-2.5 rounded-xl border focus:outline-none transition-all flex-shrink-0 ${
            isRecording 
              ? 'bg-[#e52c50]/20 border-[#e52c50] text-[#e52c50] animate-pulse' 
              : 'bg-fifa-dark border-fifa-border/80 text-fifa-textMuted hover:border-fifa-border hover:text-white'
          }`}
          aria-label={isRecording ? "Stop voice recording" : "Record voice input"}
        >
          {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage(inputText);
          }}
          placeholder="Ask where is your seat, nearest food, or gate..."
          className="flex-1 bg-fifa-dark border border-fifa-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-fifa-primary font-sans"
        />

        <button
          onClick={() => handleSendMessage(inputText)}
          aria-label="Send message"
          className="bg-fifa-primary hover:bg-fifa-primary/80 text-white p-2.5 rounded-xl transition-all flex-shrink-0 focus:outline-none"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>

    </section>
  );
};
export default ChatInterface;

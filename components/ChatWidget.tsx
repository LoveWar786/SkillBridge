import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Link as LinkIcon, Search, Mic, Headphones, Download, AlertCircle, ExternalLink, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import { sendChatMessage, base64ToArrayBuffer, decodeAudioData } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { jsPDF } from "jspdf";

const SimpleMarkdown = ({ text }: { text: string }) => {
  // Simple parser for **bold** and *list items
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
};

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', content: "Hi! I'm your career assistant. Ask me about industry trends, salary expectations, or skills you should learn!" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ type: 'image' | 'file', preview: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Mode State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [keySelectionRequired, setKeySelectionRequired] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // Live session

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Clean up audio contexts on unmount
  useEffect(() => {
    return () => {
      disconnectLiveSession();
    };
  }, []);

  const handleSend = async () => {
    if ((!inputValue.trim() && !attachment) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      attachment: attachment ? { name: attachment.name, preview: attachment.preview, type: attachment.type } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    const currentAttachment = attachment;
    setAttachment(null);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    
    try {
      const response = await sendChatMessage(history, userMsg.content, currentAttachment || undefined);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        sources: response.sources
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const isImage = file.type.startsWith('image/');
      setAttachment({
        type: isImage ? 'image' : 'file',
        preview: reader.result as string,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadChat = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Stylish Header
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Career Assistant Chat History", margin, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Saved on ${new Date().toLocaleDateString()}`, margin, 30);
    yPos = 55;

    messages.forEach((msg) => {
        // Check for new page
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        const isUser = msg.role === 'user';
        const bubbleWidth = pageWidth - (margin * 2) - 20;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", isUser ? "bold" : "normal");
        
        const cleanContent = msg.content.replace(/\*\*/g, ''); // Remove asterisks for PDF
        const lines = doc.splitTextToSize(cleanContent, bubbleWidth - 10);
        const height = (lines.length * 5) + 15;

        // Draw Bubble
        if (isUser) {
            doc.setFillColor(37, 99, 235); // Blue for user
            doc.roundedRect(pageWidth - margin - bubbleWidth, yPos, bubbleWidth, height, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(lines, pageWidth - margin - bubbleWidth + 5, yPos + 10);
            doc.text("You", pageWidth - margin - bubbleWidth + 5, yPos + 6);
        } else {
            doc.setFillColor(241, 245, 249); // Slate for bot
            doc.roundedRect(margin, yPos, bubbleWidth, height, 3, 3, 'F');
            doc.setTextColor(30, 41, 59);
            doc.text(lines, margin + 5, yPos + 10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(59, 130, 246);
            doc.text("SkillBridge AI", margin + 5, yPos + 6);
        }

        yPos += height + 5;
    });

    doc.save("Career_Chat_History.pdf");
  };

  // --- Live API Logic ---

  const handleSelectKey = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setKeySelectionRequired(false);
        setLiveError(null);
        connectLiveSession(true); // Automatically proceed after selection attempt
      }
    } catch (e) {
      console.error("Failed to open key selection", e);
    }
  };

  const connectLiveSession = async (skipKeyCheck: boolean | React.MouseEvent = false) => {
    const shouldSkip = typeof skipKeyCheck === 'boolean' ? skipKeyCheck : false;

    try {
      setLiveError(null);
      setIsLoading(true);

      // Rule: Verify API key selection for premium models
      // User requested to bypass paid key check
      /*
      if (!shouldSkip && window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setKeySelectionRequired(true);
          setIsLoading(false);
          return;
        }
      }
      */

      // Create new client instance right before connection as per instructions
      // Using GEMINI_API_KEY to ensure we use the environment key if available (free tier support)
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      // Initialize Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a helpful and encouraging career coach. Keep responses concise and conversational."
        },
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            setIsLiveConnected(true);
            setIsLoading(false);

            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              
              // Manual base64 encoding as per requirement
              let binary = '';
              const bytes = new Uint8Array(int16.buffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                      media: {
                          data: base64Data,
                          mimeType: 'audio/pcm;rate=16000'
                      }
                  });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBytes = base64ToArrayBuffer(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => sourcesRef.current.delete(source);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }

             if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => {
                  try { s.stop(); } catch (e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
             console.log("Session Closed");
             setIsLiveConnected(false);
             setIsLoading(false);
          },
          onerror: (err: any) => {
             console.error("Live API Error", err);
             // Handle generic Network Error or specific missing entity
             const errorMessage = err?.message || "Connection failed. Please check your internet or API project status.";
             // if (errorMessage.includes("Requested entity was not found")) {
             //     setKeySelectionRequired(true);
             // }
             setLiveError(errorMessage);
             setIsLiveConnected(false);
             setIsLoading(false);
             disconnectLiveSession();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error("Failed to connect to Live API", e);
      setLiveError(e?.message || "Failed to start voice session.");
      setIsLoading(false);
    }
  };

  const disconnectLiveSession = async () => {
     if (sessionRef.current) {
        sessionRef.current.then((s:any) => {
          if (s && typeof s.close === 'function') s.close();
        });
        sessionRef.current = null;
     }
     if (inputAudioContextRef.current) {
         try { await inputAudioContextRef.current.close(); } catch (e) {}
         inputAudioContextRef.current = null;
     }
     if (outputAudioContextRef.current) {
        try { await outputAudioContextRef.current.close(); } catch (e) {}
        outputAudioContextRef.current = null;
     }
     setIsLiveConnected(false);
  };

  const toggleVoiceMode = async () => {
      if (isVoiceMode) {
          await disconnectLiveSession();
          setIsVoiceMode(false);
          setLiveError(null);
          setKeySelectionRequired(false);
      } else {
          setIsVoiceMode(true);
      }
  };

  return (
    <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] border border-slate-200 dark:border-slate-800 mb-4 flex flex-col pointer-events-auto animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-blue-600 dark:bg-slate-950 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                    {isVoiceMode ? <Headphones className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <span className="font-bold">{isVoiceMode ? 'Live Career Talk' : 'Career Assistant'}</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleVoiceMode}
                    className={`p-1.5 rounded-lg transition-colors ${isVoiceMode ? 'bg-white text-blue-600' : 'hover:bg-white/20'}`}
                    title={isVoiceMode ? "Switch to Text Chat" : "Switch to Voice Mode"}
                >
                    {isVoiceMode ? <MessageSquare className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button 
                    onClick={handleDownloadChat}
                    className="hover:bg-white/20 p-1.5 rounded transition-colors"
                    title="Download Chat PDF"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* Body */}
          {isVoiceMode ? (
              <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-center p-6 space-y-8 relative overflow-hidden">
                  {isLiveConnected && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                          <div className="w-64 h-64 bg-blue-500 rounded-full animate-ping"></div>
                      </div>
                  )}

                  <div className="relative z-10">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isLiveConnected ? 'bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)] scale-110' : 'bg-slate-800'
                      }`}>
                          {isLoading ? (
                              <Loader2 className="w-12 h-12 text-white animate-spin" />
                          ) : (
                              <Mic className={`w-12 h-12 ${isLiveConnected ? 'text-white' : 'text-slate-500'}`} />
                          )}
                      </div>
                  </div>

                  <div className="z-10 px-4">
                      {keySelectionRequired ? (
                        <div className="space-y-4">
                           <div className="flex items-center justify-center gap-2 text-amber-400 font-bold mb-1">
                              <AlertCircle className="w-5 h-5" />
                              <span>Key Required</span>
                           </div>
                           <p className="text-slate-400 text-sm mb-4">
                              Native audio interaction requires selecting a project key with billing enabled.
                           </p>
                           <button 
                              onClick={handleSelectKey}
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold transition-colors"
                           >
                              Select Paid API Key
                           </button>
                           <a 
                              href="https://ai.google.dev/gemini-api/docs/billing" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 underline"
                           >
                              Billing Docs <ExternalLink className="w-3 h-3" />
                           </a>
                        </div>
                      ) : liveError ? (
                        <ErrorMessage 
                          title="Connection Error"
                          message={liveError}
                          variant="error"
                          onRetry={connectLiveSession}
                          onClose={() => setLiveError(null)}
                          solutions={[
                            "Check your internet connection",
                            "Ensure microphone permissions are granted",
                            "Try refreshing the page if the issue persists"
                          ]}
                          className="bg-red-900/20 border-red-800 text-red-200"
                        />
                      ) : (
                        <>
                           <h3 className="text-white text-xl font-semibold mb-2">
                               {isLiveConnected ? "Listening..." : "Tap Start to Talk"}
                           </h3>
                           <p className="text-slate-400 text-sm max-w-[200px] mx-auto">
                               {isLiveConnected 
                                ? "Ask me anything about your career path, resume, or interview prep." 
                                : "Start a real-time voice session to practice answering interview questions."}
                           </p>
                        </>
                      )}
                  </div>

                  {!keySelectionRequired && !liveError && (
                    <button 
                        onClick={isLiveConnected ? disconnectLiveSession : connectLiveSession}
                        disabled={isLoading}
                        className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all z-10 ${
                            isLiveConnected 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
                        }`}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLiveConnected ? 'End Session' : 'Start Talking'}
                    </button>
                  )}
              </div>
          ) : (
            <>
              {/* Text Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
                    }`}>
                      <p className={`whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          <SimpleMarkdown text={msg.content} />
                      </p>
                      
                      {msg.attachment && (
                        <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${msg.role === 'user' ? 'bg-blue-700' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          {msg.attachment.type === 'image' ? (
                            <img src={msg.attachment.preview} alt="attachment" className="max-w-full h-auto max-h-32 rounded" />
                          ) : (
                            <>
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="text-xs truncate">{msg.attachment.name}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Source Grounding */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                <Search className="w-3 h-3" />
                                <span>Sources</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {msg.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:underline truncate"
                                    >
                                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{source.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-3 shadow-sm">
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Text Input */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                {attachment && (
                  <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {attachment.type === 'image' ? (
                        <img src={attachment.preview} alt="preview" className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{attachment.name}</span>
                    </div>
                    <button onClick={() => setAttachment(null)} className="p-1 text-slate-500 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about skills..."
                    className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={(!inputValue.trim() && !attachment) || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-500/30 transition-all hover:scale-110 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
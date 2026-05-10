import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Link as LinkIcon, Search, Mic, Headphones, Download, AlertCircle, ExternalLink, Paperclip, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorMessage from './ErrorMessage';
import { sendChatMessageStream, base64ToArrayBuffer, decodeAudioData } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { jsPDF } from "jspdf";
import ReactMarkdown from 'react-markdown';

// --- ROBUST MARKDOWN FOR UI ---
const SimpleMarkdown = ({ text }: { text: string }) => {
  return (
    <div className="markdown-content text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-3 mb-1 text-inherit" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-2 mb-1 text-inherit" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-base font-bold mt-2 mb-1 text-inherit" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc ml-5 mt-1 mb-2 text-inherit space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal ml-5 mt-1 mb-2 text-inherit space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="mb-0 text-inherit" {...props} />,
          p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-inherit" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-inherit" {...props} />,
          em: ({node, ...props}) => <em className="italic text-inherit" {...props} />,
          code: ({node, ...props}) => <code className="bg-black/20 rounded px-1 py-0.5 font-mono text-[0.85em] text-inherit" {...props} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

const SourceList = ({ sources }: { sources: Array<{ title: string; uri: string }> }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors w-full"
      >
        <Search className="w-3 h-3" />
        <span>Sources ({sources.length})</span>
        {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>
      
      {isExpanded && (
        <div className="flex flex-col gap-1 mt-1 animate-in slide-in-from-top-1 duration-200">
          {sources.map((source, idx) => (
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
      )}
    </div>
  );
};

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const[messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      content: `# Welcome to SkillBridge!

Hi! I'm your **Career Assistant**. I can help you navigate your professional journey. Ask me about:

## Industry Trends
Stay up-to-date with the latest demands in tech, finance, healthcare, and more. Discover which roles are growing rapidly and which skills are becoming obsolete in today's fast-paced market.

### Key Areas of Focus:
-   Artificial Intelligence & Machine Learning
-   Cloud Computing Architecture
-   Data Science and Analytics

## Interview Preparation
I can conduct mock interviews, provide detailed feedback on your answers, and give you actionable tips on how to handle difficult behavioral questions using the STAR method.

Let me know how I can help you today!` 
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const[isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ type: 'image' | 'file', preview: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Mode State
  const[isVoiceMode, setIsVoiceMode] = useState(false);
  const[isLiveConnected, setIsLiveConnected] = useState(false);
  const[keySelectionRequired, setKeySelectionRequired] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isScrolledUpRef = useRef(false);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      isScrolledUpRef.current = !isAtBottom;
    }
  };

  const scrollToBottom = (force = false) => {
    if (!isScrolledUpRef.current || force) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  },[messages, isOpen]);

  useEffect(() => {
    return () => {
      disconnectLiveSession();
    };
  },[]);

  const handleSend = async () => {
    if ((!inputValue.trim() && !attachment) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      attachment: attachment ? { name: attachment.name, preview: attachment.preview, type: attachment.type } : undefined
    };

    setMessages(prev =>[...prev, userMsg]);
    setInputValue('');
    const currentAttachment = attachment;
    setAttachment(null);
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    
    try {
      // INSTRUCT THE AI TO VERIFY IF THE DOCUMENT IS CAREER-RELATED
      let apiContent = userMsg.content;
      if (currentAttachment) {
          const aiGuidance = "\n\n[SYSTEM INSTRUCTION: Analyze the attached file or image. If it is NOT related to careers, resumes, jobs, portfolios, or professional development, politely refuse to process it and inform the user that you can only assist with career-related documents. If it IS career-related, proceed normally with the user's request.]";
          apiContent = apiContent ? apiContent + aiGuidance : aiGuidance.trim();
      }

      const stream = sendChatMessageStream(history, apiContent, currentAttachment || undefined);
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev =>[...prev, { id: botMsgId, role: 'model', content: '', sources: [] }]);
      
      isScrolledUpRef.current = false;
      setTimeout(() => scrollToBottom(true), 50);

      for await (const chunk of stream) {
          setMessages(prev => prev.map(m => 
              m.id === botMsgId ? { ...m, content: chunk.text, sources: chunk.sources } : m
          ));
          scrollToBottom();
      }
    } catch (e: any) {
      console.error(e);
      let errorMessage = "Sorry, I'm having trouble connecting right now.";
      const errorString = JSON.stringify(e);
      if (e.message?.includes("429") || errorString.includes("429") || e.status === 429 || errorString.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "The AI service is currently busy (Rate Limit Exceeded). Please wait a few seconds and try again.";
      } else if (e.message) {
        errorMessage = `Sorry, I'm having trouble connecting right now (${e.message}).`;
      }
      setMessages(prev =>[...prev, { id: Date.now().toString(), role: 'model', content: errorMessage }]);
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

  // --- PDF MARKDOWN & LAYOUT ENGINE ---
  const handleDownloadChat = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;

    const drawZapIcon = (x: number, y: number, size: number, color:[number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        doc.triangle(x + 13*s, y + 2*s, x + 13*s, y + 10*s, x + 5*s, y + 14*s, 'F');
        doc.triangle(x + 13*s, y + 10*s, x + 19*s, y + 10*s, x + 11*s, y + 22*s, 'F');
        doc.triangle(x + 13*s, y + 10*s, x + 5*s, y + 14*s, x + 11*s, y + 14*s, 'F'); 
    };

    // Dark Theme Colors
    const bgR = 15, bgG = 23, bgB = 42; 
    const textR = 255, textG = 255, textB = 255; 
    
    // Background
    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header
    drawZapIcon(margin, 15, 20,[59, 130, 246]);

    doc.setTextColor(textR, textG, textB);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("SkillBridge", margin + 25, 28);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); 
    doc.text("Career Chat History", margin + 25, 36);

    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, 28, { align: 'right' });
    
    doc.setDrawColor(51, 65, 85); 
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    yPos = 60;

    // --- MARKDOWN PROCESSOR FOR JSPDF ---
    const processMarkdown = (text: string, maxWidth: number) => {
        const blocks = text.split('\n');
        const layout: any[] =[];

        blocks.forEach(block => {
            let type = 'p';
            let content = block.trim();
            if (content === '') {
                layout.push({ type: 'spacer', height: 4 });
                return;
            }

            let indent = 0;
            let fontSize = 10;
            let forceBold = false;
            let prefix = '';

            // Block Level Parsing
            if (content.startsWith('### ')) { type = 'h3'; content = content.slice(4); fontSize = 12; forceBold = true; }
            else if (content.startsWith('## ')) { type = 'h2'; content = content.slice(3); fontSize = 14; forceBold = true; }
            else if (content.startsWith('# ')) { type = 'h1'; content = content.slice(2); fontSize = 16; forceBold = true; }
            else if (content.match(/^[-*] /)) { type = 'bullet'; content = content.slice(2); indent = 5; prefix = '• '; }
            else if (content.match(/^\d+\. /)) {
                const match = content.match(/^(\d+\. )/);
                type = 'numbered';
                indent = 5;
                if (match) {
                    prefix = match[1];
                    content = content.slice(match[1].length);
                }
            }

            // Inline Parsing (Bold, Italic, Code)
            const tokens = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g).filter(Boolean).map(t => {
                if (t.startsWith('**') && t.endsWith('**')) return { text: t.slice(2, -2), font: 'bold' };
                if (t.startsWith('*') && t.endsWith('*')) return { text: t.slice(1, -1), font: 'italic' };
                if (t.startsWith('`') && t.endsWith('`')) return { text: t.slice(1, -1), font: 'courier' };
                return { text: t, font: 'normal' };
            });

            if (forceBold) tokens.forEach(t => t.font = 'bold');

            // Set up environment to accurately measure text width
            doc.setFont("helvetica", forceBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            const prefixWidth = prefix ? doc.getTextWidth(prefix) : 0;
            const activeMaxWidth = maxWidth - indent - prefixWidth;
            
            const lineHeight = fontSize * 0.352778 * 1.4; // standard proportional line height
            let currentLine: any[] =[];
            let currentLineWidth = 0;

            // Word wrap engine
            tokens.forEach(token => {
                const fontName = token.font === 'courier' ? 'courier' : 'helvetica';
                const fontStyle = ['bold', 'italic'].includes(token.font) ? token.font : 'normal';
                doc.setFont(fontName, fontStyle);
                doc.setFontSize(fontSize);

                const words: string[] = token.text.match(/(\S+|\s+)/g) ||[];

                words.forEach(word => {
                    const w = doc.getTextWidth(word);
                    // Wrap to next line if width exceeded
                    if (currentLineWidth + w > activeMaxWidth && currentLineWidth > 0 && word.trim() !== '') {
                        layout.push({ type, segments: currentLine, height: lineHeight, indent, prefix, fontSize, forceBold });
                        currentLine =[{ text: word.replace(/^\s+/, ''), font: token.font }];
                        currentLineWidth = doc.getTextWidth(currentLine[0].text);
                        prefix = ''; // Prefix applies only to the first line
                    } else {
                        currentLine.push({ text: word, font: token.font });
                        currentLineWidth += w;
                    }
                });
            });

            if (currentLine.length > 0) {
                layout.push({ type, segments: currentLine, height: lineHeight, indent, prefix, fontSize, forceBold });
            }

            layout.push({ type: 'spacer', height:['h1','h2','h3'].includes(type) ? 4 : 2 });
        });

        if (layout.length > 0 && layout[layout.length - 1].type === 'spacer') layout.pop();
        return layout;
    };

    messages.forEach((msg) => {
        const isUser = msg.role === 'user';
        const bubbleMaxWidth = (pageWidth - (margin * 2)) * 0.75; 
        
        // Ensure File attachments are explicitly visible in the PDF
        let pdfTextContent = msg.content || "";
        if (msg.attachment) {
            const attachmentString = `**[File Attachment: ${msg.attachment.name}]**`;
            pdfTextContent = pdfTextContent ? `${pdfTextContent}\n\n${attachmentString}` : attachmentString;
        }

        const layoutLines = processMarkdown(pdfTextContent, bubbleMaxWidth - 10);
        
        let remainingLayout = [...layoutLines];
        let remainingSources = msg.sources ?[...msg.sources] :[];
        let isFirstPart = true;

        // Loop handles splitting long bubbles dynamically across pages
        while (remainingLayout.length > 0 || remainingSources.length > 0) {
            let availableHeight = pageHeight - 20 - yPos;
            
            let minRequiredHeight = 16; // 8 top + 8 bottom padding
            if (isFirstPart) minRequiredHeight += 8; // ME / AI Label
            
            if (remainingLayout.length > 0) {
                minRequiredHeight += remainingLayout[0].height;
            } else if (remainingSources.length > 0) {
                minRequiredHeight += 15; // Sources label + 1 source
            }

            // Flip to new page if not enough space
            if (availableHeight < minRequiredHeight) {
                doc.addPage();
                doc.setFillColor(bgR, bgG, bgB);
                doc.rect(0, 0, pageWidth, pageHeight, 'F'); 
                yPos = 30;
                availableHeight = pageHeight - 20 - yPos;
            }

            let linesToFit: any[] = [];
            let sourcesToFit: any[] =[];
            
            let currentHeight = 16; 
            if (isFirstPart) currentHeight += 8;

            while (remainingLayout.length > 0) {
                if (currentHeight + remainingLayout[0].height > availableHeight) break;
                const line = remainingLayout.shift();
                linesToFit.push(line);
                currentHeight += line.height;
            }

            if (remainingLayout.length === 0 && remainingSources.length > 0) {
                let sourceHeaderNeeded = 10; 
                if (currentHeight + sourceHeaderNeeded + 5 <= availableHeight) {
                    let headerAdded = false;
                    while (remainingSources.length > 0) {
                        if (!headerAdded) {
                            currentHeight += sourceHeaderNeeded;
                            headerAdded = true;
                        }
                        if (currentHeight + 5 > availableHeight) break;
                        sourcesToFit.push(remainingSources.shift());
                        currentHeight += 5;
                    }
                }
            }

            const xPos = isUser ? (pageWidth - margin - bubbleMaxWidth) : margin;

            // Draw Bubble
            if (isUser) {
                doc.setFillColor(37, 99, 235); 
                doc.setDrawColor(29, 78, 216); 
            } else {
                doc.setFillColor(30, 41, 59); 
                doc.setDrawColor(51, 65, 85); 
            }
            doc.roundedRect(xPos, yPos, bubbleMaxWidth, currentHeight, 3, 3, 'FD');

            let textY = yPos + 8;

            // Draw speaker label
            if (isFirstPart) {
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                if (isUser) {
                    doc.setTextColor(191, 219, 254); 
                    doc.text("ME", xPos + 5, textY);
                } else {
                    doc.setTextColor(148, 163, 184); 
                    doc.text("AI ASSISTANT", xPos + 5, textY);
                }
                textY += 6; 
            }

            textY += 3; // Nudge to text baseline

            // Draw Markdown Lines
            doc.setTextColor(255, 255, 255); 
            linesToFit.forEach(line => {
                if (line.type === 'spacer') {
                    textY += line.height;
                    return;
                }

                let currentX = xPos + 5 + (line.indent || 0);

                if (line.prefix) {
                    doc.setFont("helvetica", line.forceBold ? "bold" : "normal");
                    doc.setFontSize(line.fontSize || 10);
                    doc.text(line.prefix, currentX, textY);
                    currentX += doc.getTextWidth(line.prefix);
                }

                line.segments.forEach((seg: any) => {
                    const fontName = seg.font === 'courier' ? 'courier' : 'helvetica';
                    const fontStyle = ['bold', 'italic'].includes(seg.font) ? seg.font : 'normal';
                    doc.setFont(fontName, fontStyle);
                    doc.setFontSize(line.fontSize || 10);
                    
                    doc.text(seg.text, currentX, textY);
                    currentX += doc.getTextWidth(seg.text);
                });

                textY += line.height;
            });

            // Draw Sources
            if (sourcesToFit.length > 0) {
                textY += 2;
                
                doc.setDrawColor(255, 255, 255); 
                doc.setLineWidth(0.1);
                doc.line(xPos + 5, textY - 3, xPos + bubbleMaxWidth - 5, textY - 3);
                
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(148, 163, 184); 
                doc.text("SOURCES:", xPos + 5, textY);
                
                textY += 4;

                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(96, 165, 250); 
                
                sourcesToFit.forEach(source => {
                    const truncatedTitle = doc.splitTextToSize(`• ${source.title}`, bubbleMaxWidth - 10);
                    doc.textWithLink(truncatedTitle[0], xPos + 5, textY, { url: source.uri });
                    textY += 5;
                });
            }

            yPos += currentHeight + 6; // Margin between chunks/bubbles
            isFirstPart = false;
        }
    });

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105); 
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.text("SkillBridge AI Career Assistant", margin, pageHeight - 10);
    }

    doc.save(`SkillBridge_Chat_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleSelectKey = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setKeySelectionRequired(false);
        setLiveError(null);
        connectLiveSession(true); 
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

      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
             const errorMessage = err?.message || "Connection failed. Please check your internet or API project status.";
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
                <div className="flex flex-col">
                    <span className="font-bold text-sm">{isVoiceMode ? 'Live Career Talk' : 'Career Assistant'}</span>
                    <span className="text-[10px] text-blue-100 opacity-90 font-medium">
                        {isVoiceMode ? 'Gemini 2.5 Flash Audio' : 'Gemini 2.5 Flash'}
                    </span>
                </div>
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
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950"
              >
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
                    }`}>
                      <div className={`whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          <SimpleMarkdown text={msg.content} />
                      </div>
                      
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
                        <SourceList sources={msg.sources} />
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
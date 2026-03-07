import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, LearningStep } from '../types';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { AlertTriangle, BookOpen, Briefcase, ArrowRight, BrainCircuit, Volume2, StopCircle, Loader2, Clock, Lightbulb, Download, ChevronDown, User, Star } from 'lucide-react';
import { generateSpeech, decodeAudioData, base64ToArrayBuffer } from '../services/geminiService';
import { jsPDF } from "jspdf";

interface StepAnalysisProps {
  result: AnalysisResult;
  candidateName?: string;
  experienceYears?: number;
  onReset: () => void;
}

const LearningStepItem: React.FC<{ step: LearningStep; index: number }> = ({ step, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative pl-8 group">
         <div className="absolute -left-[7px] top-6 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900 shadow-sm z-10" />
         
         <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="flex-1 pr-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{step.step}</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">{step.title}</h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold w-fit">
                                <Clock className="w-3.5 h-3.5" />
                                {step.estimatedTime}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                </div>
            </button>
            
            {isOpen && (
                <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 mt-4 font-normal">
                        {step.description}
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/50 flex items-start gap-3">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md flex-shrink-0">
                            <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">Recommended Suggestion</span>
                            <div className="mt-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{step.resourceName}</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{step.resourceSuggestion}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
         </div>
    </div>
  );
};

const StepAnalysis: React.FC<StepAnalysisProps> = ({ result, candidateName, experienceYears, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Refs for audio management
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isStopRequestedRef = useRef<boolean>(false);

  // Sort Roles Descending by Match Percentage
  const sortedRoles = useMemo(() => {
    return [...result.alternativeRoles].sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [result.alternativeRoles]);

  // Score UI Helpers
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#f97316';
    return '#ef4444';
  };

  const getScoreBg = (score: number) => {
     if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
     if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
     if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
     if (score >= 20) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
     return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  const scoreData = [{ 
    name: 'Score', 
    value: result.readinessScore, 
    fill: getScoreColor(result.readinessScore) 
  }];

  const stopAudio = () => {
    isStopRequestedRef.current = true;
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    setIsPlaying(false);
    setIsLoadingAudio(false);
    if (audioContextRef.current) {
        try { audioContextRef.current.suspend(); } catch (e) {}
    }
  };

  const playSentence = async (text: string): Promise<number> => {
    if (isStopRequestedRef.current) return 0;
    
    // Optimistic start for TTS
    const response = await generateSpeech(text);
    if (!response?.audioData || isStopRequestedRef.current) return 0;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    // Ensure context is running
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const audioBytes = base64ToArrayBuffer(response.audioData);
    const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    const startTime = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
    source.start(startTime);
    
    activeSourcesRef.current.push(source);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
    
    return audioBuffer.duration;
  };

  const handlePlaySummary = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoadingAudio(true);
    isStopRequestedRef.current = false;
    nextStartTimeRef.current = 0;

    // Use a very simple split to get the first phrase out INSTANTLY
    const firstPeriodIndex = result.executiveSummary.indexOf('.');
    const firstChunk = firstPeriodIndex > -1 
        ? result.executiveSummary.substring(0, firstPeriodIndex + 1)
        : result.executiveSummary;
    const remainingText = firstPeriodIndex > -1 
        ? result.executiveSummary.substring(firstPeriodIndex + 1)
        : '';

    // Further split remaining text
    const remainingSentences = remainingText.match(/[^.!?]+[.!?]+/g) || (remainingText ? [remainingText] : []);
    
    try {
      // 1. Play first chunk ASAP
      const firstDuration = await playSentence(firstChunk);
      
      if (firstDuration > 0) {
        setIsLoadingAudio(false);
        setIsPlaying(true);
        
        // 2. Queue the rest in background
        for (const sentence of remainingSentences) {
            if (isStopRequestedRef.current) break;
            await playSentence(sentence);
        }

        // Auto-stop logic
        const totalDurationMs = (nextStartTimeRef.current - audioContextRef.current!.currentTime) * 1000;
        setTimeout(() => {
          if (!isStopRequestedRef.current) {
            setIsPlaying(false);
          }
        }, totalDurationMs + 500);
      } else {
        setIsLoadingAudio(false);
      }
    } catch (e) {
      console.error("Failed to play audio summary", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  };

  const getIconPng = async (id: string): Promise<string> => {
    const svgEl = document.getElementById(id) as unknown as SVGSVGElement | null;
    if (!svgEl) return '';
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const scale = 4;
        const width = 24;
        const height = 24;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('');
        ctx.scale(scale, scale);
        
        if (!svgEl.getAttribute('xmlns')) {
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        
        const svgString = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        const base64 = btoa(unescape(encodeURIComponent(svgString)));
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = 'data:image/svg+xml;base64,' + base64;
    });
  };

  // --- High Quality PDF Generation ---
  const handleSavePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;

    // Fetch Icons
    const brainIcon = await getIconPng('pdf-icon-brain');
    const alertIcon = await getIconPng('pdf-icon-alert');
    const bookIcon = await getIconPng('pdf-icon-book');
    const briefcaseIcon = await getIconPng('pdf-icon-briefcase');

    // Detect Dark Mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? [15, 23, 42] : [255, 255, 255]; // Slate-900 or White
    const textColor = isDarkMode ? [255, 255, 255] : [30, 41, 59]; // White or Slate-800
    const secondaryTextColor = isDarkMode ? [148, 163, 184] : [71, 85, 105]; // Slate-400 or Slate-600
    const cardBgColor = isDarkMode ? [30, 41, 59] : [255, 255, 255]; // Slate-800 or White
    const cardBorderColor = isDarkMode ? [51, 65, 85] : [226, 232, 240]; // Slate-700 or Slate-200

    // Set Background
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- Helpers ---
    const checkSpace = (h: number) => {
        if (yPos + h > pageHeight - margin - 10) {
            doc.addPage();
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            yPos = 20;
            return true;
        }
        return false;
    };

    const drawCard = (x: number, y: number, w: number, h: number, bg: [number, number, number] = cardBgColor as [number, number, number]) => {
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, w, h, 4, 4, 'FD');
    };

    // --- Icon Helpers (Refined for Lucide look) ---
    const drawZapIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        // Lucide Zap: 13,2 13,10 19,10 11,22 11,14 5,14
        doc.triangle(x + 13*s, y + 2*s, x + 13*s, y + 10*s, x + 5*s, y + 14*s, 'F');
        doc.triangle(x + 13*s, y + 10*s, x + 19*s, y + 10*s, x + 11*s, y + 22*s, 'F');
        doc.triangle(x + 13*s, y + 10*s, x + 5*s, y + 14*s, x + 11*s, y + 14*s, 'F'); 
    };

    const drawAlertIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        // Circle
        doc.circle(x + 12*s, y + 12*s, 10*s, 'F');
        // Exclamation (white)
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 11*s, y + 7*s, 2*s, 6*s, 'F');
        doc.circle(x + 12*s, y + 16*s, 1.5*s, 'F');
    };

    const drawBookIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        // Book Open Shape
        doc.rect(x + 4*s, y + 6*s, 6*s, 12*s, 'F'); // Left Page
        doc.rect(x + 14*s, y + 6*s, 6*s, 12*s, 'F'); // Right Page
        doc.rect(x + 10*s, y + 6*s, 4*s, 12*s, 'F'); // Spine/Center
    };

    const drawBriefcaseIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        // Handle
        doc.rect(x + 8*s, y + 3*s, 8*s, 4*s, 'F');
        // Body
        doc.roundedRect(x + 3*s, y + 7*s, 18*s, 13*s, 1*s, 1*s, 'F');
        // Cutout
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(x + 10*s, y + 5*s, 4*s, 2*s, 'F');
    };

    const drawLightbulbIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        const s = size / 24;
        // Bulb
        doc.circle(x + 12*s, y + 9*s, 6*s, 'F');
        // Base
        doc.rect(x + 9*s, y + 15*s, 6*s, 4*s, 'F');
        // Bottom contact
        doc.rect(x + 10*s, y + 20*s, 4*s, 2*s, 'F');
    };

    // --- Header ---
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Logo (Zap)
    const logoColor: [number, number, number] = [59, 130, 246]; // Blue-500 (Website color)
    drawZapIcon(margin, 15, 16, logoColor); // Slightly larger

    // Title
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24); // Larger to match website
    doc.text("SkillBridge", margin + 22, 26);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.text("AI-Powered Career Analysis", margin + 22, 34);

    if (candidateName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(candidateName, pageWidth - margin, 22, { align: 'right' });
        
        if (experienceYears !== undefined) {
             const expText = `${experienceYears} Years Exp.`;
             doc.setFontSize(11);
             doc.setFont("helvetica", "normal");
             doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
             doc.text(expText, pageWidth - margin, 28, { align: 'right' });
        }
        
        doc.setFontSize(10);
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin, 34, { align: 'right' });
    }

    // Divider
    doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, 45, pageWidth - margin, 45);

    yPos = 55;

    // --- Top Summary Section ---
    // ... (Score logic same as before) ...
    let r=239, g=68, b=68; let bgR=254, bgG=242, bgB=242;
    if (result.readinessScore >= 80) { r=34; g=197; b=94; bgR=240; bgG=253; bgB=244; }
    else if (result.readinessScore >= 60) { r=59; g=130; b=246; bgR=239; bgG=246; bgB=255; }
    else if (result.readinessScore >= 40) { r=234; g=179; b=8; bgR=254; bgG=252; bgB=232; }
    else if (result.readinessScore >= 20) { r=249; g=115; b=22; bgR=255; bgG=247; bgB=237; }

    drawCard(margin, yPos, 60, 45, [bgR, bgG, bgB]);
    
    doc.setTextColor(r, g, b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("READINESS SCORE", margin + 30, yPos + 12, { align: "center" });

    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.readinessScore}%`, margin + 30, yPos + 28, { align: "center" });

    doc.setFillColor(r, g, b); 
    doc.roundedRect(margin + 10, yPos + 34, 40, 8, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(result.readinessLevel.toUpperCase(), margin + 30, yPos + 39.5, { align: "center" });

    const summaryWidth = pageWidth - margin * 2 - 65;
    drawCard(margin + 65, yPos, summaryWidth, 48);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    if (brainIcon) {
        doc.addImage(brainIcon, 'PNG', margin + 70, yPos + 7, 6, 6);
        doc.text("AI Executive Summary", margin + 78, yPos + 12);
    } else {
        doc.text("AI Executive Summary", margin + 75, yPos + 12);
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    const summaryLines = doc.splitTextToSize(result.executiveSummary, summaryWidth - 20);
    doc.text(summaryLines, margin + 75, yPos + 20);

    yPos += 55;

    // --- Critical Skill Gaps ---
    checkSpace(40);
    // Section Header
    doc.setFillColor(isDarkMode ? 69 : 254, isDarkMode ? 10 : 242, isDarkMode ? 10 : 242);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 4, 4, 'F');
    
    if (alertIcon) {
        doc.addImage(alertIcon, 'PNG', margin + 6, yPos + 3.5, 7, 7);
    } else {
        drawAlertIcon(margin + 6, yPos + 3, 8, isDarkMode ? [248, 113, 113] : [220, 38, 38]);
    }
    
    doc.setTextColor(isDarkMode ? 252 : 185, isDarkMode ? 165 : 28, isDarkMode ? 165 : 28);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Critical Skill Gaps", margin + 16, yPos + 9.5);
    yPos += 16;

    result.skillGaps.forEach(gap => {
        const fullWidth = pageWidth - (margin * 2);
        const reasonLines = doc.splitTextToSize(gap.reason, fullWidth - 30);
        const cardHeight = 24 + (reasonLines.length * 5);
        
        checkSpace(cardHeight + 8);
        drawCard(margin, yPos, fullWidth, cardHeight);

        // Priority Bullet (Left side)
        const isHigh = gap.priority === 'High';
        const priorityColor = isHigh ? [239, 68, 68] : [234, 179, 8];
        doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
        doc.circle(margin + 6, yPos + 11.5, 1.5, 'F');

        // Priority Badge (Right Aligned)
        const priorityBg = isHigh ? [254, 242, 242] : [254, 252, 232];
        
        // Badge BG
        doc.setFillColor(priorityBg[0], priorityBg[1], priorityBg[2]);
        doc.roundedRect(margin + fullWidth - 35, yPos + 6, 25, 6, 3, 3, 'F');
        // Badge Text
        doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(gap.priority.toUpperCase(), margin + fullWidth - 22.5, yPos + 10, { align: 'center' });

        // Title
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(gap.skill, margin + 12, yPos + 10);

        // Status Badge (Next to Title) - Compact
        const skillWidth = doc.getTextWidth(gap.skill);
        // Dark Grey Badge like screenshot
        doc.setFillColor(51, 65, 85); // Slate-700
        const statusW = doc.getTextWidth(gap.status) + 8;
        doc.roundedRect(margin + 12 + skillWidth + 8, yPos + 6, statusW, 6, 3, 3, 'F');
        doc.setTextColor(203, 213, 225); // Slate-300
        doc.setFontSize(8);
        doc.text(gap.status.toUpperCase(), margin + 12 + skillWidth + 12, yPos + 10);

        // Reason
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(reasonLines, margin + 12, yPos + 18);

        yPos += cardHeight + 4;
    });

    yPos += 8;

    // --- Recommended Learning Path (Full Width) ---
    checkSpace(40);
    doc.setFillColor(isDarkMode ? 30 : 239, isDarkMode ? 58 : 246, isDarkMode ? 138 : 255); // Blue-50 or Dark Blue
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 4, 4, 'F');
    
    // Icon
    if (bookIcon) {
        doc.addImage(bookIcon, 'PNG', margin + 6, yPos + 3.5, 7, 7);
    } else {
        drawBookIcon(margin + 6, yPos + 3, 8, isDarkMode ? [96, 165, 250] : [37, 99, 235]);
    }

    doc.setTextColor(isDarkMode ? 147 : 29, isDarkMode ? 197 : 78, isDarkMode ? 253 : 216); // Blue-700 or Light Blue
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Learning Path", margin + 16, yPos + 9.5);
    yPos += 16;

    result.learningPath.forEach((step, i) => {
        const fullWidth = pageWidth - (margin * 2);
        const descLines = doc.splitTextToSize(step.description, fullWidth - 30);
        
        // Calculate height including the suggestion box
        // Title (12) + Desc (lines*5) + Gap (8) + SuggestionBox (22) + Padding (15)
        const suggestionBoxHeight = 22;
        const cardHeight = 25 + (descLines.length * 5) + suggestionBoxHeight;
        
        checkSpace(cardHeight + 8);

        drawCard(margin, yPos, fullWidth, cardHeight);

        // Step ID
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(step.step.toUpperCase(), margin + 10, yPos + 8);

        // Title
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(12);
        doc.text(step.title, margin + 10, yPos + 14);
        
        // Time Badge - Same Line as Title, Right Aligned
        const timeW = doc.getTextWidth(step.estimatedTime) + 10;
        const timeX = margin + fullWidth - timeW - 10;
        
        doc.setFillColor(isDarkMode ? 30 : 239, isDarkMode ? 58 : 246, isDarkMode ? 138 : 255);
        doc.roundedRect(timeX, yPos + 8, timeW, 8, 4, 4, 'F');
        
        doc.setTextColor(isDarkMode ? 147 : 29, isDarkMode ? 197 : 78, isDarkMode ? 253 : 216);
        doc.setFontSize(9);
        doc.text(step.estimatedTime, timeX + 5, yPos + 13.5);

        // Desc
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(descLines, margin + 10, yPos + 22);

        // Suggestion Box (Website Style Match)
        const boxY = yPos + 24 + (descLines.length * 5);
        // Dark background for box (Slate-800) - Match screenshot
        const boxBg = isDarkMode ? [30, 41, 59] : [241, 245, 249]; // Slate-800 or Slate-100
        doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
        // No border, just fill
        doc.roundedRect(margin + 10, boxY, fullWidth - 20, 22, 4, 4, 'F');
        
        // Icon Box (Amber-900/50 or Amber-100)
        const iconBg = isDarkMode ? [69, 26, 3] : [254, 252, 232]; // Amber-950 or Amber-50
        doc.setFillColor(iconBg[0], iconBg[1], iconBg[2]);
        doc.roundedRect(margin + 14, boxY + 4, 14, 14, 3, 3, 'F');
        
        // Icon (Amber-500 or Amber-600)
        drawLightbulbIcon(margin + 15, boxY + 5, 12, [245, 158, 11]); // Amber-500

        // Label
        doc.setTextColor(isDarkMode ? 148 : 100, isDarkMode ? 163 : 116, isDarkMode ? 184 : 139); // Slate-400 or Slate-500
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("RECOMMENDED SUGGESTION", margin + 34, boxY + 8);

        // Resource Name (Bold)
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(step.resourceName, margin + 34, boxY + 13);

        // Suggestion
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(step.resourceSuggestion, margin + 34, boxY + 18);

        yPos += cardHeight + 4;
    });

    yPos += 8;
    
    // --- Alternative Roles (Vertical Layout) ---
    // Calculate total height needed for background
    let totalSectionHeight = 18; // Header + padding
    const fullWidth = pageWidth - (margin * 2);
    
    sortedRoles.forEach(role => {
        const matchLines = doc.splitTextToSize(role.matchReason, fullWidth - 30);
        const cardHeight = 28 + (matchLines.length * 5);
        totalSectionHeight += cardHeight + 4;
    });
    
    checkSpace(totalSectionHeight > (pageHeight - margin * 2) ? 40 : totalSectionHeight);
    
    // Draw Section Background (Header)
    doc.setFillColor(isDarkMode ? 15 : 15, isDarkMode ? 23 : 23, isDarkMode ? 42 : 42); // Slate-900
    // If it fits on one page, draw the full background
    if (yPos + totalSectionHeight <= pageHeight - margin) {
        doc.roundedRect(margin, yPos, fullWidth, totalSectionHeight, 6, 6, 'F');
    } else {
        // Just draw header background if it spans multiple pages
        doc.roundedRect(margin, yPos, fullWidth, 14, 4, 4, 'F');
    }
    
    // Icon
    if (briefcaseIcon) {
        doc.addImage(briefcaseIcon, 'PNG', margin + 8, yPos + 3.5, 7, 7);
    } else {
        drawBriefcaseIcon(margin + 6, yPos + 3, 8, [255, 255, 255]);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Alternative Career Paths", margin + 18, yPos + 9.5);
    
    yPos += 18;

    sortedRoles.forEach(role => {
        const matchLines = doc.splitTextToSize(role.matchReason, fullWidth - 30);
        const cardHeight = 28 + (matchLines.length * 5);

        checkSpace(cardHeight + 8);

        // Card BG - Dark theme for alternative roles
        const roleCardBg: [number, number, number] = isDarkMode ? [30, 41, 59] : [15, 23, 42]; // Slate-800 or Slate-900
        doc.setFillColor(roleCardBg[0], roleCardBg[1], roleCardBg[2]);
        doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 4, yPos, fullWidth - 8, cardHeight, 4, 4, 'FD');

        // Role Name
        doc.setTextColor(255, 255, 255); // Always white text on dark bg
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(role.role, margin + 14, yPos + 10);

        // Percent Badge
        const percentText = `${role.matchPercentage}% Match`;
        const percentW = doc.getTextWidth(percentText) + 8;
        doc.setFillColor(30, 58, 138); // Blue-900
        doc.roundedRect(pageWidth - margin - percentW - 14, yPos + 6, percentW, 6, 2, 2, 'F');
        doc.setTextColor(147, 197, 253); // Blue-300
        doc.setFontSize(9);
        doc.text(percentText, pageWidth - margin - percentW - 10, yPos + 10);

        // Bar BG
        doc.setFillColor(51, 65, 85); // Slate-700
        doc.roundedRect(margin + 14, yPos + 14, fullWidth - 28, 2.5, 1.25, 1.25, 'F');
        // Bar Fill
        doc.setFillColor(59, 130, 246); // Blue-500
        const fillW = ((fullWidth - 28) * role.matchPercentage) / 100;
        doc.roundedRect(margin + 14, yPos + 14, fillW, 2.5, 1.25, 1.25, 'F');
        
        // Reason (Full)
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(matchLines, margin + 14, yPos + 22);

        yPos += cardHeight + 4;
    });

    const filename = `SkillBridge Analysis ${candidateName || 'User'}.pdf`;
    doc.save(filename);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Hidden SVGs for PDF Generation */}
      <div style={{ display: 'none' }}>
        <BrainCircuit id="pdf-icon-brain" color="#a855f7" size={24} />
        <AlertTriangle id="pdf-icon-alert" color="#ef4444" size={24} />
        <BookOpen id="pdf-icon-book" color="#3b82f6" size={24} />
        <Briefcase id="pdf-icon-briefcase" color="#60a5fa" size={24} />
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex-shrink-0 w-full md:w-80 flex flex-col items-center justify-center text-center">
            {candidateName && (
                <div className="mb-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full flex flex-col items-center gap-1 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                         <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                         <span className="font-bold text-slate-700 dark:text-white text-sm truncate max-w-[200px]">{candidateName}</span>
                    </div>
                    {experienceYears !== undefined && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                             <Star className="w-3 h-3 text-amber-500" />
                             <span>{experienceYears} Years Exp.</span>
                        </div>
                    )}
                </div>
            )}
            <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400 mb-2">Readiness Score</h3>
            <div className="h-48 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={15} data={scoreData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-slate-800 dark:text-white">{result.readinessScore}%</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full mt-2 capitalize ${getScoreBg(result.readinessScore)}`}>
                            {result.readinessLevel}
                        </span>
                    </div>
                </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">AI Confidence: High</p>
        </div>

        <div className="flex-grow bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">AI Executive Summary</h3>
                </div>
                <button 
                    onClick={handlePlaySummary}
                    disabled={isLoadingAudio}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                      isPlaying 
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {isLoadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     isPlaying ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isLoadingAudio ? 'Loading...' : isPlaying ? 'Stop' : 'Listen'}
                </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                {result.executiveSummary}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                    Critical Skill Gaps
                </h3>
            </div>
            <div className="p-6 space-y-4 flex-grow">
                {result.skillGaps.map((gap, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow bg-white dark:bg-slate-950/50">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            gap.priority === 'High' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">{gap.skill}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">{gap.status}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{gap.reason}</p>
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">Priority: {gap.priority}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    Recommended Learning Path
                </h3>
            </div>
            <div className="p-8">
                 <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-8">
                    {result.learningPath.map((step, i) => (
                        <LearningStepItem key={i} step={step} index={i} />
                    ))}
                 </div>
            </div>
        </div>
      </div>

      {result.alternativeRoles.length > 0 && (
         <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                Alternative Career Paths
            </h3>
            <p className="text-slate-300 mb-6">Based on your current skill profile, you are a stronger match for these roles:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedRoles.map((roleItem, i) => (
                    <div key={i} className="bg-slate-800 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-700 hover:border-blue-500/50 transition-colors group">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">{roleItem.role}</h4>
                            <span className="text-xs font-bold bg-blue-900 text-white dark:text-blue-400 px-2 py-1 rounded">
                                {roleItem.matchPercentage}% Match
                            </span>
                        </div>
                        
                        {/* Match Bar */}
                        <div className="w-full bg-slate-700 h-1.5 rounded-full mb-3 overflow-hidden">
                             <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                style={{ width: `${roleItem.matchPercentage}%` }}
                             ></div>
                        </div>

                        <p className="text-sm text-slate-400 leading-snug">{roleItem.matchReason}</p>
                    </div>
                ))}
            </div>
         </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
        <button 
            onClick={onReset} 
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Start Over
        </button>
        <button 
            onClick={handleSavePDF} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-md flex items-center gap-2 transition-transform hover:scale-105"
        >
            <Download className="w-5 h-5" />
            Download PDF Report
        </button>
      </div>
    </div>
  );
};

export default StepAnalysis;
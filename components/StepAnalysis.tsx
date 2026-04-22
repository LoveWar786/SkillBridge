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

  // --- High Quality PDF Generation ---
  const handleSavePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;

    // --- Helpers ---
    const checkSpace = (h: number) => {
        // More generous buffer at bottom
        if (yPos + h > pageHeight - margin - 10) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    };

    const drawCard = (x: number, y: number, w: number, h: number, bg: [number, number, number] = [255,255,255]) => {
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
    };

    // --- Header ---
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("SkillBridge", margin, 25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("AI-Powered Career Analysis", margin, 34);

    if (candidateName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20); // Even Bigger Name
        doc.setTextColor(255, 255, 255); 
        
        // Calculate text width to place experience beside it
        const nameWidth = doc.getTextWidth(candidateName);
        const startX = pageWidth - margin - nameWidth;
        
        doc.text(candidateName, pageWidth - margin, 25, { align: 'right' });
        
        if (experienceYears !== undefined) {
             const expText = `•  ${experienceYears} Years Exp.`;
             doc.setFontSize(12);
             doc.setFont("helvetica", "normal");
             doc.setTextColor(219, 234, 254); // Blue-100
             doc.text(expText, pageWidth - margin - nameWidth - 5, 25, { align: 'right' });
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(219, 234, 254);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 35, { align: 'right' });
    }

    yPos = 65;

    // --- Top Summary Section (Score + Summary) ---
    // Draw Readiness Score Card (Left)
    drawCard(margin, yPos, 60, 50);
    
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("READINESS SCORE", margin + 30, yPos + 10, { align: "center" });

    let r=239, g=68, b=68; // Red
    if (result.readinessScore >= 80) { r=34; g=197; b=94; } // Green
    else if (result.readinessScore >= 60) { r=59; g=130; b=246; } // Blue
    else if (result.readinessScore >= 40) { r=234; g=179; b=8; } // Yellow

    doc.setTextColor(r, g, b);
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.readinessScore}%`, margin + 30, yPos + 26, { align: "center" });

    doc.setFillColor(r, g, b); 
    doc.roundedRect(margin + 10, yPos + 34, 40, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(result.readinessLevel, margin + 30, yPos + 39, { align: "center" });

    // Draw Executive Summary Card (Right)
    const summaryWidth = pageWidth - margin * 3 - 60;
    drawCard(margin + 70, yPos, summaryWidth, 50);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AI Executive Summary", margin + 75, yPos + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(result.executiveSummary, summaryWidth - 10);
    doc.text(summaryLines, margin + 75, yPos + 18);

    yPos += 60;

    // --- Critical Skill Gaps (Full Width) ---
    checkSpace(30);
    doc.setFillColor(254, 242, 242); // Red-50
    doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
    doc.setTextColor(185, 28, 28); // Red-700
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Critical Skill Gaps", margin + 5, yPos + 8);
    yPos += 15;

    result.skillGaps.forEach(gap => {
        const fullWidth = pageWidth - (margin * 2);
        const reasonLines = doc.splitTextToSize(gap.reason, fullWidth - 20);
        const cardHeight = 25 + (reasonLines.length * 4);
        
        checkSpace(cardHeight + 5);
        
        // Card Background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(margin, yPos, fullWidth, cardHeight, 3, 3, 'FD');

        // Priority Dot
        const isHigh = gap.priority === 'High';
        doc.setFillColor(isHigh ? 239 : 234, isHigh ? 68 : 179, isHigh ? 68 : 8);
        doc.circle(margin + 6, yPos + 8, 2, 'F');

        // Text
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(gap.skill, margin + 12, yPos + 9);

        // Status Badge
        doc.setFillColor(241, 245, 249);
        const skillWidth = doc.getTextWidth(gap.skill);
        doc.roundedRect(margin + 12 + skillWidth + 5, yPos + 5, doc.getTextWidth(gap.status) + 6, 6, 1, 1, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(gap.status, margin + 12 + skillWidth + 8, yPos + 9);

        // Reason
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(reasonLines, margin + 12, yPos + 16);

        yPos += cardHeight + 5;
    });

    yPos += 10;

    // --- Recommended Learning Path (Full Width) ---
    checkSpace(30);
    doc.setFillColor(239, 246, 255); // Blue-50
    doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');
    doc.setTextColor(29, 78, 216); // Blue-700
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Learning Path", margin + 5, yPos + 8);
    yPos += 15;

    result.learningPath.forEach((step, i) => {
        const fullWidth = pageWidth - (margin * 2);
        const descLines = doc.splitTextToSize(step.description, fullWidth - 20);
        const cardHeight = 35 + (descLines.length * 4);
        
        checkSpace(cardHeight + 5);

        // Draw connecting line from prev step if not first
        // (Simplified for sequential vertical layout - no line needed if simple stack, 
        // but let's keep it simple and clean cards)
        
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, yPos, fullWidth, cardHeight, 3, 3, 'FD');

        // Step ID
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(step.step, margin + 5, yPos + 8);

        // Title
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.setFontSize(11);
        doc.text(step.title, margin + 5, yPos + 14);
        
        // Time Badge
        const timeW = doc.getTextWidth(step.estimatedTime) + 6;
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.roundedRect(margin + 5, yPos + 18, timeW, 6, 2, 2, 'F');
        doc.setTextColor(29, 78, 216); // Blue-700
        doc.setFontSize(8);
        doc.text(step.estimatedTime, margin + 8, yPos + 22);

        // Desc
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(descLines, margin + 5, yPos + 30);

        yPos += cardHeight + 5;
    });

    yPos += 10;
    
    // --- Alternative Roles (Dark Section) ---
    // Calculate required height for roles row
    const rolesHeight = 70;
    checkSpace(rolesHeight);
    
    // Dark Background
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), rolesHeight, 3, 3, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Alternative Career Paths", margin + 10, yPos + 12);
    
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Based on your current skill profile:", margin + 10, yPos + 20);

    // Render Roles Grid (Horizontal in PDF)
    let roleX = margin + 10;
    const roleW = (pageWidth - (margin * 2) - 40) / 3;
    
    sortedRoles.slice(0, 3).forEach(role => {
        // Inner Card (Slate-800)
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(roleX, yPos + 25, roleW, 35, 2, 2, 'F');
        
        // Role Name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const safeRole = role.role.length > 20 ? role.role.substring(0, 18) + '...' : role.role;
        doc.text(safeRole, roleX + 5, yPos + 32);

        // Percent
        doc.setTextColor(191, 219, 254); // Blue-200
        doc.setFontSize(8);
        doc.text(`${role.matchPercentage}%`, roleX + roleW - 5, yPos + 32, { align: 'right' });

        // Bar BG
        doc.setFillColor(51, 65, 85);
        doc.rect(roleX + 5, yPos + 36, roleW - 10, 2, 'F');
        // Bar Fill
        doc.setFillColor(59, 130, 246);
        const fillW = ((roleW - 10) * role.matchPercentage) / 100;
        doc.rect(roleX + 5, yPos + 36, fillW, 2, 'F');
        
        // Reason (Tiny)
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const matchLines = doc.splitTextToSize(role.matchReason, roleW - 10);
        if (matchLines.length > 0) doc.text(matchLines[0], roleX + 5, yPos + 43);

        roleX += roleW + 10;
    });

    doc.save("SkillBridge_Analysis.pdf");
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
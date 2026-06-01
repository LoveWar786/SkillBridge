import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnalysisResult, LearningStep } from '../types';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { AlertTriangle, BookOpen, Briefcase, ArrowRight, BrainCircuit, Volume2, StopCircle, Loader2, Clock, Lightbulb, Download, ChevronDown, User, Star, Share2 } from 'lucide-react';
import { generateSpeech, decodeAudioData, base64ToArrayBuffer } from '../services/geminiService';
import ErrorMessage from './ErrorMessage';
import FeedbackWidget from './FeedbackWidget';
import ShareModal from './ShareModal';
import { generatePDFReport } from '../services/pdfService';

import { auth } from '../firebase';

interface StepAnalysisProps {
  result: AnalysisResult;
  candidateName?: string;
  experienceYears?: number;
  jobRole?: string;
  companyName?: string;
  onReset: () => void;
  analysisId?: string;
  hasFeedback?: boolean;
  onFeedbackSubmit?: () => void;
  modelUsed?: string;
  cost?: number;
  isSharedView?: boolean;
}

const LearningStepItem: React.FC<{ step: LearningStep }> = ({ step }) => {
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

const StepAnalysis: React.FC<StepAnalysisProps> = ({ result, candidateName, experienceYears, jobRole, companyName, onReset, analysisId, hasFeedback, onFeedbackSubmit, modelUsed, cost, isSharedView = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    if (score >= 60) return '#8b5cf6';
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
        setError("Failed to load audio. Please try again.");
      }
    } catch (e) {
      console.error("Failed to play audio summary", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setError("An error occurred while generating audio.");
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleSavePDF = async () => {
    try {
      const success = await generatePDFReport({
        candidateName: candidateName || "User",
        jobRole: jobRole || "Report",
        companyName: companyName || "",
        experienceYears,
        timestamp: new Date(),
        result
      });
      if (!success) {
        setError("Failed to generate PDF. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setError("An error occurred while generating PDF.");
    }
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
      {error && (
        <div className="mb-8">
          <ErrorMessage 
            title="Analysis Error"
            message={error}
            variant="error"
            onClose={() => setError(null)}
          />
        </div>
      )}

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
            
            {/* Model Info */}
            {(modelUsed || cost) && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 w-full">
                    {modelUsed && (
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Model:</span>
                            <span className="font-mono">{modelUsed}</span>
                        </div>
                    )}
                    {cost !== undefined && (
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Est. Cost:</span>
                            <span className="font-mono">{cost} credits</span>
                        </div>
                    )}
                </div>
            )}
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
                        <LearningStepItem key={i} step={step} />
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

      {/* Feedback Section */}
      {!hasFeedback && (
        <div className="max-w-2xl mx-auto mt-12 mb-8">
          <FeedbackWidget analysisId={analysisId} onFeedbackSubmit={onFeedbackSubmit} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
        <button 
            onClick={onReset} 
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            <ArrowRight className="w-4 h-4 rotate-180" />
            {isSharedView ? 'Create Your Own Analysis' : 'Start Over'}
        </button>
        {!isSharedView && auth.currentUser && (
          <button 
              onClick={handleShare} 
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-lg shadow-md flex items-center gap-2 transition-transform hover:scale-105"
          >
              <Share2 className="w-5 h-5" />
              Share Result
          </button>
        )}
        <button 
            onClick={() => handleSavePDF()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-md flex items-center gap-2 transition-transform hover:scale-105"
        >
            <Download className="w-5 h-5" />
            Download PDF Report
        </button>
      </div>

      {analysisId && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          analysisId={analysisId}
          analysisData={result}
        />
      )}
    </div>
  );
};

export default StepAnalysis;
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ArrowLeft, FileText, Users, Zap, CheckCircle2, Sparkles, Moon, Sun, 
  LayoutDashboard, History, LogOut, Settings, Plus, Download, Trash2, Save, 
  Clock, Share2, Search, ChevronDown, Star, Play, Pause, 
  RefreshCw, HelpCircle, BookOpen, Layers, Award,
  BrainCircuit, Loader2, Coins, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../services/authService';
import { AnalysisHistoryItem, Draft } from '../types';
import { statsService, GlobalStats } from '../services/statsService';
import { testimonialService, Testimonial } from '../services/testimonialService';
import Logo from './Logo';
import ShareModal from './ShareModal';
import { HistoryEmptyState, DraftsEmptyState } from './EmptyState';
import DraftsGuideModal from './DraftsGuideModal';
import SubmitTestimonialModal from './SubmitTestimonialModal';
import { generatePDFReport } from '../services/pdfService';

interface LandingPageProps {
  onTryDemo: () => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onBuyCredits?: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  user?: User | null;
  onLogout?: () => void;
  history?: AnalysisHistoryItem[];
  onViewHistory?: (item: AnalysisHistoryItem) => void;
  onDeleteHistory?: (itemId: string) => void;
  onSettingsClick?: () => void;
  drafts?: Draft[];
  onResumeDraft?: (draft: Draft) => void;
  onDeleteDraft?: (draftId: string) => void;
  viewMode?: 'landing' | 'dashboard';
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onTryDemo, 
  onLoginClick, 
  onSignupClick,
  onBuyCredits,
  darkMode, 
  toggleDarkMode, 
  user, 
  onLogout,
  history = [],
  onViewHistory,
  onDeleteHistory,
  onSettingsClick,
  drafts = [],
  onResumeDraft,
  onDeleteDraft,
  viewMode = 'landing'
}) => {
  // Stats counters
  const [stats, setStats] = useState<GlobalStats>({
    totalAnalyses: 1250,
    totalUsers: 850,
    cvsParsedToday: 45,
    activeUsers: 12
  });

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDraftsGuideOpen, setIsDraftsGuideOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const escapeCSVValue = (val: any): string => {
    if (val === undefined || val === null) return '';
    let stringVal = String(val);
    stringVal = stringVal.replace(/"/g, '""');
    if (/[,"\n\r]/.test(stringVal)) {
      stringVal = `"${stringVal}"`;
    }
    return stringVal;
  };

  const exportHistoryToCSV = (items: AnalysisHistoryItem[]) => {
    if (items.length === 0) return;

    const headers = [
      "Candidate Name",
      "Job Role",
      "Company Name",
      "Analysis Date",
      "Readiness Score",
      "Readiness Level",
      "Executive Summary",
      "Skill Gaps",
      "Learning Path Steps",
      "Feedback Rating",
      "Feedback Comment"
    ];

    const rows = items.map(item => {
      const gapStrings = item.result.skillGaps?.map(g => 
        `${g.skill} (${g.status}, ${g.priority})`
      ).join(' | ') || '';

      const pathStrings = item.result.learningPath?.map(s => 
        `${s.step}: ${s.title} (${s.resourceName}, ${s.estimatedTime})`
      ).join(' | ') || '';

      return [
        escapeCSVValue(item.candidateName || user?.name || 'Unknown'),
        escapeCSVValue(item.jobRole),
        escapeCSVValue(item.companyName || ''),
        escapeCSVValue(new Date(item.timestamp).toLocaleString()),
        item.result.readinessScore,
        escapeCSVValue(item.result.readinessLevel),
        escapeCSVValue(item.result.executiveSummary),
        escapeCSVValue(gapStrings),
        escapeCSVValue(pathStrings),
        item.feedback?.rating || '',
        escapeCSVValue(item.feedback?.comment || '')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `skillbridge_analysis_history_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSingleItemToCSV = (item: AnalysisHistoryItem) => {
    exportHistoryToCSV([item]);
  };

  // States for the automatic interactive demo tour
  const [demoStep, setDemoStep] = useState(0);
  const [demoProgress, setDemoProgress] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(true);

  // States for the FAQ interactive accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);

  // States for Export Dropdowns
  const [hasSharedTestimonial, setHasSharedTestimonial] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasSharedTestimonial(false);
      return;
    }
    if (user?.uid) {
      testimonialService.checkIfUserSubmitted(user.uid).then((hasSubmitted) => {
        if (hasSubmitted) setHasSharedTestimonial(true);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && testimonials.length > 0) {
      const userHasVerifiedTestimonial = testimonials.some(t => 
        (t.userId && t.userId === user.uid) || 
        (t.name && user.name && t.name.toLowerCase() === user.name.toLowerCase())
      );
      if (userHasVerifiedTestimonial) {
        setHasSharedTestimonial(true);
      }
    }
  }, [user, testimonials]);

  const [activeExportRowId, setActiveExportRowId] = useState<string | null>(null);
  const [isExportAllOpen, setIsExportAllOpen] = useState(false);
  
  // Collapse States
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(true);

  // Testimonial Carousel Ref & State
  const testimonialScrollRef = useRef<HTMLDivElement>(null);
  const [isTestimonialHovered, setIsTestimonialHovered] = useState(false);

  useEffect(() => {
    const el = testimonialScrollRef.current;
    if (!el || isTestimonialHovered || testimonials.length <= 3) return;
    
    let rafId: number;
    let scrollPos = el.scrollLeft;
    
    const step = () => {
      scrollPos += 1.25; // moderately slow pan
      
      // If we've reached exactly halfway (end of the first half of duplicated content), jump back
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos -= el.scrollWidth / 2;
      }
      
      el.scrollLeft = scrollPos;
      rafId = requestAnimationFrame(step);
    };
    
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isTestimonialHovered, testimonials]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoadingTestimonials(true);
      const data = await testimonialService.getVerifiedTestimonials();
      setTestimonials(data);
      setLoadingTestimonials(false);
    };
    fetchTestimonials();
  }, []);

  useEffect(() => {
    if (!isDemoPlaying) return;

    const interval = setInterval(() => {
      setDemoProgress((prev) => prev >= 100 ? 100 : prev + 2.85);
    }, 100);

    return () => clearInterval(interval);
  }, [isDemoPlaying]);

  useEffect(() => {
    if (demoProgress >= 100) {
      setDemoStep((prevStep) => (prevStep + 1) % 5);
      setDemoProgress(0);
    }
  }, [demoProgress]);

  useEffect(() => {
    // Subscribe to real stats
    const unsubscribe = statsService.subscribeToStats((newStats) => {
      setStats(newStats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const loopedTestimonials = React.useMemo(() => {
    if (testimonials.length === 0) return [];
    if (testimonials.length <= 3) return testimonials;
    let repeated = [...testimonials];
    while (repeated.length < 6) {
      repeated = [...repeated, ...testimonials];
    }
    return [...repeated, ...repeated];
  }, [testimonials]);

  if (viewMode === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden relative selection:bg-blue-500/30">
        <SubmitTestimonialModal 
          isOpen={isTestimonialModalOpen}
          onClose={() => setIsTestimonialModalOpen(false)}
          darkMode={darkMode}
          user={user}
          onSuccess={() => setHasSharedTestimonial(true)}
        />
        {selectedAnalysis && (
          <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setSelectedAnalysis(null);
            }}
            analysisId={selectedAnalysis.id}
            analysisData={selectedAnalysis.result}
            jobRole={selectedAnalysis.jobRole}
            companyName={selectedAnalysis.companyName}
          />
        )}
        <DraftsGuideModal 
          isOpen={isDraftsGuideOpen}
          onClose={() => setIsDraftsGuideOpen(false)}
        />
        {/* Navbar for Logged In User */}
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Back to Landing Page"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo darkMode={darkMode} size="lg" />
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-1 sm:gap-3 pl-2 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{user.credits} Credits</p>
                {user.lastLogin && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Last Login: {new Date(user.lastLogin).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={onSettingsClick}
                className="hidden sm:block p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={onLogout}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-6 py-12 pb-24 sm:pb-12 relative z-10">
          {/* Welcome Header */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user.name}!</h1>
                <p className="text-slate-500 dark:text-slate-400">Here's what's happening with your career journey.</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {!hasSharedTestimonial && (
                  <button 
                    onClick={() => setIsTestimonialModalOpen(true)}
                    className="flex items-center justify-center flex-1 md:flex-none gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl font-bold text-sm border border-emerald-200 dark:border-emerald-800/50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Share Success
                  </button>
                )}
                <button 
                  onClick={onTryDemo}
                  className="flex items-center justify-center flex-1 md:hidden gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Start New Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-505 text-slate-500">All Time</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{history.length}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Analyses</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                  <Save className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-505 text-slate-500">In Progress</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{drafts.length}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Saved Drafts</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                  <Zap className="w-6 h-6" />
                </div>
                <button onClick={onBuyCredits || onTryDemo} className="text-xs font-medium px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 hover:bg-purple-200 transition-colors rounded-lg">
                  Buy More
                </button>
              </div>
              <h3 className="text-3xl font-bold mb-1">{user.credits}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Available Credits</p>
            </div>

            <div className="hidden sm:flex bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">Start New Analysis</h3>
                  <div className="flex items-center gap-1 select-none" title="Keyboard Shortcut">
                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono font-semibold text-white/90 shadow-sm leading-none">ALT</kbd>
                    <span className="text-white/40 text-[9px] font-bold">+</span>
                    <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[10px] font-mono font-semibold text-white/90 shadow-sm leading-none">N</kbd>
                  </div>
                </div>
                <p className="text-blue-100 text-sm mb-6 font-normal">Analyze a new job role and get a personalized learning path.</p>
              </div>
              <button 
                onClick={onTryDemo}
                className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Analysis
              </button>
            </div>
          </div>

          {/* Drafts Section */}
          <div className="mb-12">
            <div 
              className="flex items-center justify-between gap-3 mb-6 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsDraftsExpanded(!isDraftsExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-bold">Resume Progress</h2>
              </div>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isDraftsExpanded ? '' : '-rotate-90'}`} />
            </div>
            
            <AnimatePresence>
              {isDraftsExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {drafts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                      {drafts.map((draft) => (
                        <motion.div 
                          key={draft.id} 
                          className="relative overflow-hidden rounded-2xl"
                          layout
                        >
                          {/* Background Delete Action */}
                          <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6 sm:hidden">
                             <Trash2 className="w-5 h-5 text-white" />
                          </div>
                          
                          {/* Foreground Card */}
                          <motion.div 
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.5, right: 0 }}
                            onDragEnd={(_e, info) => {
                               if (info.offset.x < -80 && onDeleteDraft) {
                                   onDeleteDraft(draft.id);
                               }
                            }}
                            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-all group relative z-10 w-full"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                <FileText className="w-5 h-5" />
                              </div>
                              <button 
                                onClick={() => onDeleteDraft && onDeleteDraft(draft.id)}
                                className="sm:hidden p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => onDeleteDraft && onDeleteDraft(draft.id)}
                                className="hidden sm:block p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate">
                              {draft.jobContext?.role || 'Untitled Analysis'}
                            </h3>
                            {draft.profile?.fullName && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1 truncate">
                                Candidate: {draft.profile.fullName}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                              Saved on {formatDate(draft.timestamp)}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                                Step {draft.step}
                              </span>
                              <button 
                                onClick={() => onResumeDraft && onResumeDraft(draft)}
                                className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                              >
                                Resume <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <DraftsEmptyState onAction={() => setIsDraftsGuideOpen(true)} actionText="Configure Drafts" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Analysis History */}
          <div id="analysis-history-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
            <div 
              className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-t-3xl"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            >
              <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <History className="w-5 h-5 text-slate-55 text-slate-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Analysis History</h2>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isHistoryExpanded ? '' : '-rotate-90'}`} />
                    <div className="hidden sm:flex items-center gap-1 select-none" title="Keyboard Shortcut">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 shadow-sm leading-none">ALT</kbd>
                      <span className="text-slate-400 dark:text-slate-500 text-[9px] font-bold">+</span>
                      <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 shadow-sm leading-none">H</kbd>
                    </div>
                  </div>
                </div>
                {history.length > 0 && (
                  <div 
                    className="relative flex md:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setIsExportAllOpen(!isExportAllOpen)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-202 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-500" />
                      <span>Export</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    {isExportAllOpen && (
                      <div className="absolute right-0 mt-10 z-[60] w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 text-left">
                        <button
                          onClick={() => {
                            history.forEach((el, index) => {
                              setTimeout(() => {
                                generatePDFReport({
                                  candidateName: el.candidateName || "User",
                                  jobRole: el.jobRole || "Report",
                                  companyName: el.companyName || "",
                                  experienceYears: el.experienceYears,
                                  timestamp: el.timestamp,
                                  result: el.result
                                });
                              }, index * 400);
                            });
                            setIsExportAllOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-red-500" />
                          <span>PDF Document (.pdf)</span>
                        </button>
                        <button
                          onClick={() => {
                            exportHistoryToCSV(history);
                            setIsExportAllOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4 text-emerald-500" />
                          <span>CSV Worksheet (.csv)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Search Bar & Export */}
              {history.length > 0 && (
                <div 
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative flex-1 sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400 dark:text-slate-505 text-slate-500" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by role, company..."
                      className="w-full pl-9 pr-4 py-2 text-sm bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-505 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors bg-white"
                    />
                  </div>
                  <div className="relative hidden md:block">
                    <button
                      onClick={() => setIsExportAllOpen(!isExportAllOpen)}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-202 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 shadow-sm hover:cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-purple-500" />
                      <span>Export All</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {isExportAllOpen && (
                      <div className="absolute right-0 mt-1.5 z-[60] w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => {
                            history.forEach((el, index) => {
                              setTimeout(() => {
                                generatePDFReport({
                                  candidateName: el.candidateName || "User",
                                  jobRole: el.jobRole || "Report",
                                  companyName: el.companyName || "",
                                  experienceYears: el.experienceYears,
                                  timestamp: el.timestamp,
                                  result: el.result
                                });
                              }, index * 400);
                            });
                            setIsExportAllOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 hover:cursor-pointer group"
                        >
                          <FileText className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                          <span>PDF Document (.pdf)</span>
                        </button>
                        <button
                          onClick={() => {
                            exportHistoryToCSV(history);
                            setIsExportAllOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 hover:cursor-pointer group"
                        >
                          <Download className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                          <span>CSV Worksheet (.csv)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <AnimatePresence>
            {isHistoryExpanded && (
            <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
            >
            <div className="overflow-visible pb-24 sm:pb-0">
              {history.length > 0 ? (
                (() => {
                  const filteredHistory = history.filter((item) => {
                    if (!searchTerm.trim()) return true;
                    const lowerSearch = searchTerm.toLowerCase();
                    const roleMatch = item.jobRole?.toLowerCase().includes(lowerSearch);
                    const companyMatch = item.companyName?.toLowerCase().includes(lowerSearch);
                    const personMatch = item.candidateName?.toLowerCase().includes(lowerSearch);
                    const userFallbackMatch = (!item.candidateName && user?.name?.toLowerCase().includes(lowerSearch));
                    return roleMatch || companyMatch || personMatch || userFallbackMatch;
                  });

                  return filteredHistory.length > 0 ? (
                    <>
                    {/* Desktop View */}
                    <table className="hidden sm:table w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-405 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-4">Person's Name</th>
                          <th className="px-6 py-4">Role & Company</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Score</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-105 bg-blue-100 dark:bg-blue-900/30 text-blue-606 text-blue-600 dark:text-blue-404 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                  {(item.candidateName || user?.name || 'U').charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-white max-w-[150px] truncate" title={item.candidateName || user?.name}>
                                  {item.candidateName || user?.name || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{item.jobRole}</p>
                                {item.companyName && (
                                  <p className="text-sm text-slate-505 text-slate-500">{item.companyName}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-505 text-slate-500 dark:text-slate-404 text-slate-400">
                              {formatDate(item.timestamp)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.result.readinessScore >= 80 ? 'bg-emerald-500' :
                                      item.result.readinessScore >= 60 ? 'bg-blue-500' :
                                      item.result.readinessScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${item.result.readinessScore}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{item.result.readinessScore}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => onViewHistory && onViewHistory(item)}
                                  className="text-sm font-semibold text-white dark:text-blue-400 bg-blue-600 hover:bg-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm dark:shadow-none min-w-[70px] text-center"
                                >
                                  <span className="hidden sm:inline">View Report</span>
                                  <span className="inline sm:hidden">View</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedAnalysis(item);
                                    setIsShareModalOpen(true);
                                  }}
                                  className="text-sm font-medium text-purple-606 text-purple-600 dark:text-purple-404 text-purple-400 hover:text-purple-707 text-purple-700 dark:hover:text-purple-303 text-purple-300 px-3 py-1.5 bg-purple-55 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1.5"
                                  title="Share Report"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Share
                                </button>
                                <div className="relative">
                                  <button 
                                    onClick={() => setActiveExportRowId(activeExportRowId === item.id ? null : item.id)}
                                    className="text-sm font-medium text-purple-600 dark:text-purple-404 text-purple-400 hover:text-purple-707 text-purple-700 dark:hover:text-purple-303 text-purple-300 px-3 py-1.5 bg-purple-55 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1.5 hover:pointer shadow-xs"
                                    title="Export Options"
                                  >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    <span>Export</span>
                                    <ChevronDown className="w-3 h-3 text-slate-400 transition-transform duration-200" />
                                  </button>
                                  {activeExportRowId === item.id && (
                                    <div className="absolute right-0 top-full mt-1.5 z-[60] w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 text-left">
                                      <button
                                        onClick={() => {
                                          generatePDFReport({
                                            candidateName: item.candidateName || "User",
                                            jobRole: item.jobRole || "Report",
                                            companyName: item.companyName || "",
                                            experienceYears: item.experienceYears,
                                            timestamp: item.timestamp,
                                            result: item.result
                                          });
                                          setActiveExportRowId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 hover:cursor-pointer group"
                                      >
                                        <FileText className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                                        <span>PDF Report (.pdf)</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          exportSingleItemToCSV(item);
                                          setActiveExportRowId(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs text-slate-705 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 hover:cursor-pointer group"
                                      >
                                        <Download className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                        <span>CSV Data (.csv)</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {onDeleteHistory && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteHistory(item.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete Analysis"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile View */}
                    <div className="flex flex-col gap-3 sm:hidden p-4">
                        {filteredHistory.map((item) => (
                          <motion.div 
                            key={item.id} 
                            className="relative overflow-hidden rounded-2xl"
                            layout
                          >
                             {/* Background Delete Action */}
                             <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6">
                                <Trash2 className="w-5 h-5 text-white" />
                             </div>

                             {/* Foreground Card */}
                             <motion.div 
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={{ left: 0.5, right: 0 }}
                                onDragEnd={(_e, info) => {
                                   if (info.offset.x < -80 && onDeleteHistory) {
                                       onDeleteHistory(item.id);
                                   }
                                }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm relative z-10 w-full"
                             >
                                <div className="flex flex-col gap-3">
                                   <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                          {(item.candidateName || user?.name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                              {item.candidateName || user?.name || 'Unknown'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{formatDate(item.timestamp)}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                                        <div 
                                          className={`w-2 h-2 rounded-full ${
                                            item.result.readinessScore >= 80 ? 'bg-emerald-500' :
                                            item.result.readinessScore >= 60 ? 'bg-blue-500' :
                                            item.result.readinessScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                          }`}
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.result.readinessScore}%</span>
                                      </div>
                                   </div>

                                   <div>
                                     <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.jobRole}</p>
                                     {item.companyName && (
                                       <p className="text-xs text-slate-500 line-clamp-1">{item.companyName}</p>
                                     )}
                                   </div>

                                   {/* Actions */}
                                   <div className="flex items-center gap-2 mt-3 pt-4 border-t border-slate-100 dark:border-slate-800 w-full overflow-x-auto pb-1 hide-scrollbar">
                                      <button 
                                        onClick={() => onViewHistory && onViewHistory(item)}
                                        className="whitespace-nowrap text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg transition-colors flex-1 text-center"
                                      >
                                        <span className="hidden sm:inline">View Report</span>
                                        <span className="inline sm:hidden">View</span>
                                      </button>
                                      
                                      <button 
                                        onClick={() => {
                                          setSelectedAnalysis(item);
                                          setIsShareModalOpen(true);
                                        }}
                                        className="whitespace-nowrap text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-1"
                                      >
                                        <Share2 className="w-4 h-4" />
                                        Share
                                      </button>

                                      {onDeleteHistory && (
                                        <button 
                                          onClick={() => onDeleteHistory(item.id)}
                                          className="flex-none p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                          title="Delete Analysis"
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      )}
                                   </div>
                                </div>
                             </motion.div>
                          </motion.div>
                        ))}
                    </div>
                    </>
                  ) : (
                    <div className="p-12 text-center text-slate-505 text-slate-500 dark:text-slate-404 text-slate-400">
                      <div className="w-12 h-12 bg-slate-105 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-white mb-1">No matching results found</p>
                      <p className="text-xs">Try searching for another keyword or role.</p>
                    </div>
                  );
                })()
              ) : (
                <HistoryEmptyState onAction={onTryDemo} />
              )}
            </div>
            </motion.div>
            )}
            </AnimatePresence>
          </div>
        </main>
        
        {/* Mobile Bottom Navigation Bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-[70] px-4 py-3 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[80px] xs:max-w-[120px] truncate">{user.name}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Pro Member</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold ${
              user.credits < 2 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              <Coins className="w-3.5 h-3.5" />
              <span>{user.credits}</span>
              {onBuyCredits && (
                <button 
                  onClick={onBuyCredits}
                  className="ml-1 p-0.5 bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-full hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors"
                  title="Buy Credits"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <button 
              onClick={onSettingsClick}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Edit Profile"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED OUT LANDING VIEW
  return (
    <div className={`min-h-screen text-slate-900 dark:text-slate-50 overflow-hidden relative selection:bg-blue-500/30 transition-colors duration-500 ${darkMode ? 'bg-slate-950' : 'bg-[#fafafa]'}`}>
      
      {/* Heavy Glassmorphism & Noise Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        
        {/* Dynamic Blobs */}
        {darkMode ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[130px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[140px]" />
            <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
            <div className="absolute top-[60%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[130px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-400/20 blur-[130px]" />
            <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[110px]" />
            <div className="absolute top-[60%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-[120px]" />
          </>
        )}
        
        {/* Grid Pattern mask */}
        <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30`} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          <Logo darkMode={darkMode} size="lg" />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-4"
        >
          <button 
            onClick={toggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user ? (
            <Link 
              to="/dashboard"
              className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <button 
                onClick={onLoginClick}
                className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 sm:px-4 py-2 hidden sm:block"
              >
                Log in
              </button>
              <button 
                onClick={onSignupClick}
                className="text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:scale-105 transition-transform shadow-lg"
              >
                Sign up
              </button>
            </>
          )}
        </motion.div>
      </nav>

      {/* Section 1: Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-100 dark:border-blue-800/50 backdrop-blur-md shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Discover your perfect career fit.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold tracking-tight mb-8 leading-[1.1] text-slate-900 dark:text-white">
            Bridge the Gap to Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Next Career</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            SkillBridge provides precise diagnostics to map your current proficiencies against your target corporate roles. Instantly uncover what you're missing and exactly how to learn it.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onTryDemo}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-full font-bold text-lg shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group hover:cursor-pointer"
            >
              {user ? 'Start New Analysis' : 'Analyze Your Profile Free'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#showcase"
              className="w-full sm:w-auto px-8 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 text-slate-700 dark:text-slate-300 fill-slate-700 dark:fill-slate-300" />
              See How It Works
            </a>
          </div>
        </motion.div>

        {/* Global Statistics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <div className="p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px]" />
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 mx-auto relative z-10">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 relative z-10">
              {stats.totalUsers.toLocaleString()}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10 uppercase tracking-widest">Professionals</p>
          </div>
          
          <div className="p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px]" />
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6 mx-auto relative z-10">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 relative z-10">
              {stats.totalAnalyses.toLocaleString()}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10 uppercase tracking-widest">Analyses Run</p>
          </div>

          <div className="p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px]" />
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6 mx-auto relative z-10">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 relative z-10">
              98.4%
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10 uppercase tracking-widest">Match Accuracy</p>
          </div>
        </motion.div>
      </section>

      {/* Section 2: Self-Running Interactive Product Showcase */}
      <section id="showcase" className="relative z-10 container mx-auto px-6 py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/30 max-w-6xl my-12 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 45 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white">See SkillBridge in Action</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Our diagnostic system reads, aligns, and maps paths automatically. Watch this dynamic self-running product simulation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Simulation Steps Indicator (Left Side) */}
          <div className="lg:col-span-4 space-y-3 font-sans">
            {[
              { title: "1. Upload & Parse CV", desc: "Drag resume to extract professional competencies", color: "from-blue-500 to-indigo-600" },
              { title: "2. Profile Curation", desc: "Review, edit, and categorize skills by strength", color: "from-purple-500 to-pink-600" },
              { title: "3. Target Job Selection", desc: "Define job title, company, and AI thinking depth", color: "from-orange-500 to-amber-600" },
              { title: "4. Deep AI Diagnostics", desc: "Interactive reasoning logs and gap formulation", color: "from-emerald-500 to-teal-600" },
              { title: "5. Verdict Dashboard", desc: "Display Readiness score, gaps list, and roadmap", color: "from-blue-600 to-emerald-500" },
            ].map((step, idx) => (
              <div 
                key={idx}
                onClick={() => { setDemoStep(idx); setDemoProgress(0); }}
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                  demoStep === idx 
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md scale-[1.02]" 
                    : "border-transparent opacity-60 hover:opacity-95 bg-slate-50/20 dark:bg-transparent"
                }`}
              >
                <div>
                  <h4 className={`font-bold text-sm ${demoStep === idx ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{step.title}</h4>
                  <p className="text-xs text-slate-404 dark:text-slate-500 mt-0.5">{step.desc}</p>
                </div>
                {demoStep === idx && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                )}
              </div>
            ))}

            {/* Playback Control bar */}
            <div className="pt-2 flex items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={() => setIsDemoPlaying(!isDemoPlaying)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-white dark:hover:bg-slate-900 transition-colors hover:cursor-pointer shadow-sm"
              >
                {isDemoPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                    Pause Tour
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                    Auto Play
                  </>
                )}
              </button>
              <button
                onClick={() => { setDemoStep(0); setDemoProgress(0); }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors hover:cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Tour
              </button>
            </div>
          </div>

          {/* Interactive Screen Sandbox (Right Side) */}
          <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 relative shadow-xl overflow-hidden min-h-[460px] flex flex-col justify-between text-slate-800 dark:text-slate-200">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-4 font-sans">
              <div className="flex items-center gap-2 font-sans">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                <span className="text-xs text-slate-505 text-slate-550 dark:text-slate-400 ml-1.5 font-medium">
                  {demoStep === 0 && "Step 1: Resume Intake Module"}
                  {demoStep === 1 && "Step 2: Interactive Profile Review"}
                  {demoStep === 2 && "Step 3: Target Job Alignment"}
                  {demoStep === 3 && "Step 4: AI Diagnostic Engine"}
                  {demoStep === 4 && "Step 5: Interactive Diagnostic Dashboard"}
                </span>
              </div>
              <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 select-none rounded text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                {Math.round(demoProgress)}% Loaded
              </div>
            </div>

            {/* Simulated Content Screen - Matching real UI pages */}
            <div className="flex-1 flex flex-col justify-center min-h-[350px]">
              <AnimatePresence mode="wait">
                {demoStep === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    key="sim-step0"
                    className="space-y-4 text-left font-sans"
                  >
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Bridge Your <span className="text-blue-605 text-blue-400">Skill Gaps</span></h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Analyze skills against requirements to see what you&apos;re missing.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
                      {/* Fake Tabs */}
                      <div className="flex p-0.5 bg-slate-100 dark:bg-slate-850 rounded-lg text-[11px] font-semibold">
                        <div className="flex-1 py-1.5 text-center rounded-md bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs flex items-center justify-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Upload CV / Profile
                        </div>
                        <div className="flex-1 py-1.5 text-center rounded-md text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Enter Manually
                        </div>
                      </div>

                      {/* Fake Dropzone */}
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-slate-50 dark:bg-slate-950/40 relative flex flex-col items-center text-center space-y-3">
                        <motion.div 
                          className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                          animate={{ top: ["20%", "80%", "20%"] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        />
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/25 text-blue-650 text-blue-400 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">Extracting skills from resume_alex_chen.pdf</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-1">Found 8 distinct skills • Ready in seconds</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {demoStep === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    key="sim-step1"
                    className="space-y-4 text-left font-sans animate-fade-in"
                  >
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Review & Edit Profile</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Refine parsed skills list for the highest diagnostic accuracy.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/85 shadow-xs space-y-3">
                      {/* Name Card header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/65">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Alex Chen</p>
                          <p className="text-[10px] text-slate-400">3.5 Years Experience • Fullstack Developer</p>
                        </div>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 font-semibold">Parsed & Verified</span>
                      </div>

                      {/* Mock Categorized Skills Badges */}
                      <div className="space-y-2.5">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Advanced Core</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {["TypeScript", "React 18", "Tailwind CSS", "REST APIs"].map(s => (
                              <span key={s} className="px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-[9px] font-bold rounded border border-green-200 dark:border-green-900/40">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Intermediate Stack</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {["Node.js", "PostgreSQL", "Git / GitHub"].map(s => (
                              <span key={s} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-355 text-[9px] font-bold rounded border border-blue-200 dark:border-blue-900/40">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <div className="px-3 py-1 bg-blue-600 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          Confirm & Continue <ArrowRight className="w-3" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {demoStep === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    key="sim-step2"
                    className="space-y-4 text-left font-sans animate-fade-in"
                  >
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Target Position & Brain Profile</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Set target benchmark standard and select AI reasoning model.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/85 shadow-xs space-y-3">
                      {/* Search Role Input */}
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Job Role Title</span>
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200 font-medium">
                          Senior Frontend Lead
                        </div>
                      </div>

                      {/* Company Choice Cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 border rounded border-slate-200 dark:border-slate-800 bg-slate-50/20 opacity-50 text-[10px]">
                          <p className="font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Generalized Role</p>
                        </div>
                        <div className="p-2 border border-blue-500 rounded bg-blue-50/5 dark:bg-blue-950/10 text-[10px] text-blue-600 dark:text-blue-400">
                          <p className="font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Specific Company</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Benchmark target: <span className="font-bold text-blue-500">Stripe Inc.</span></p>
                        </div>
                      </div>

                      {/* Thinking Slider */}
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">AI Reasoning Depth</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {["Fastest", "Balanced", "Deep Thinking"].map((v, i) => (
                            <div 
                              key={v} 
                              className={`p-1.5 rounded border text-center text-[9px] font-semibold transition-all ${
                                i === 2 
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300" 
                                  : "border-slate-200 dark:border-slate-800 opacity-60"
                              }`}
                            >
                              {v} ({i === 0 ? "2" : i === 1 ? "4" : "6" } Cr)
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <div className="px-3 py-1 bg-blue-600 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          <Zap className="w-3" /> Analyze Gaps
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {demoStep === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key="sim-step3"
                    className="space-y-4 text-left font-sans duration-300 relative"
                  >
                    <div className="flex items-center justify-between space-y-1">
                      <div>
                        <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Deep AI Diagnostics</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gemini is parsing benchmark criteria and isolating architectural expectation gaps.</p>
                      </div>
                      <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 uppercase animate-pulse">Running Diagnostics</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-xl space-y-3 font-mono text-[11px] text-emerald-400 min-h-[220px] flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-1.5 mb-2">
                          <BrainCircuit className="w-4 h-4 text-purple-400 animate-pulse" />
                          <span className="font-bold text-xs tracking-wider">ANALYSIS COGNITION TERMINAL</span>
                          <span className="ml-auto text-[9px] text-slate-500 font-bold bg-slate-900 px-1.5 py-0.5 rounded">MODE: DEEP RUN</span>
                        </div>
                        
                        <div className="space-y-1.5 leading-relaxed overflow-hidden">
                          <p className="text-slate-500 select-none">{"$ skillbridge --analyze-profile --template=stripe-senior-lead"}</p>
                          <p className="flex items-center gap-2 text-blue-300">
                            <span className="text-slate-600">➔</span> <span>[SYSTEM] Loaded profile: Alex Chen (3.5 YOE)</span>
                          </p>
                          <p className="flex items-center gap-2 text-amber-300">
                            <span className="text-slate-600">➔</span> <span>[BENCHMARK] Standard expectations extracted from Stripe Inc.</span>
                          </p>
                          <p className="flex items-center gap-2 text-indigo-400 animate-pulse">
                            <span className="text-slate-600">➔</span> <span>[COGNITION] Evaluating semantic comparison vectors...</span>
                          </p>
                          {demoProgress > 40 && (
                            <p className="flex items-center gap-2 text-rose-400 animate-in fade-in duration-300">
                              <span className="text-rose-500">⚠</span> <span>[GAP DEFINED] Absent mastery: Turborepo monorepos</span>
                            </p>
                          )}
                          {demoProgress > 70 && (
                            <p className="flex items-center gap-2 text-rose-400 animate-in fade-in duration-300">
                              <span className="text-rose-500">⚠</span> <span>[GAP DEFINED] Weakness: SSR Server Side Hydration Streaming</span>
                            </p>
                          )}
                          {demoProgress > 85 && (
                            <p className="flex items-center gap-2 text-emerald-400 animate-in fade-in duration-300">
                              <span className="text-emerald-500">✓</span> <span>[ROADMAPPING] Mapping milestones & personalized resources...</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-850 pt-2 text-slate-500">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                          <span className="text-[10px] animate-pulse">Running Diagnostic Chains...</span>
                        </div>
                        <span className="font-bold text-emerald-400 text-xs">{Math.round(demoProgress)}%</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {demoStep === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    key="sim-step4"
                    className="space-y-4 text-left font-sans animate-fade-in"
                  >
                    <div className="flex items-center justify-between space-y-1">
                      <div>
                        <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Interactive Diagnostic Report</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Full alignment diagnostics score with dual recommendation paths.</p>
                      </div>
                      <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900/40 uppercase animate-pulse">Confidence: High</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/85 shadow-xs space-y-3">
                      {/* Score / Summary section */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/65">
                        {/* Left: Score Box */}
                        <div className="md:col-span-4 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold text-slate-400 font-sans mb-1 uppercase tracking-wider">READINESS SCORE</span>
                          
                          {/* Custom Circular SVG Progress */}
                          <div className="relative w-20 h-20 flex items-center justify-center my-1 select-none">
                            <svg className="absolute w-full h-full transform -rotate-90">
                              <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                              <circle cx="40" cy="40" r="30" stroke="#10b981" strokeWidth="5" fill="transparent" strokeDasharray="188.4" strokeDashoffset="26.3" strokeLinecap="round" />
                            </svg>
                            <span className="text-lg font-black text-slate-900 dark:text-white">86%</span>
                          </div>
                          
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 uppercase mt-1">High Readiness</span>
                        </div>
                        
                        {/* Right: Executive Summary */}
                        <div className="md:col-span-8 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <BrainCircuit className="w-4 h-4 text-purple-500 dark:text-purple-400 animate-pulse" />
                              <h6 className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">AI EXECUTIVE SUMMARY</h6>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-305 text-slate-400 leading-relaxed font-normal">
                              Alex is an outstanding Frontend developer with high styling precision. Aligning with Stripe requires bridging the monorepo gap and Next.js Streaming protocols, adding an estimated 9 transition days.
                            </p>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-sans mt-2">Target: Stripe Inc. • Candidate: Alex Chen</p>
                        </div>
                      </div>

                      {/* Bottom: Alternative paths block */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">RECOMMENDED ALTERNATIVE ROLES</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850/80">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800 dark:text-slate-200">
                              <span>Staff Design Architect</span>
                              <span className="text-purple-600 dark:text-purple-400 font-extrabold">92% Match</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-purple-500 h-full rounded-full" style={{ width: "92%" }} />
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850/80">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800 dark:text-slate-200">
                              <span>Platform Engineer</span>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">74% Match</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full" style={{ width: "74%" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-6">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 h-full"
                  style={{ width: `${demoProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Core Features & Value Propositions */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-xs bg-indigo-100/50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-md mb-4 inline-block">
            Intelligence Engine
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            Engineered to Bridge the Professional Gap
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">
            Unlike standard keyword parsers, SkillBridge is an interactive career diagnostic suite operating on deep reasoning algorithms.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              title: "Profile Parser",
              desc: "Deep visual structure and document analyzing extract precise latent talents other systems miss."
            },
            {
              icon: <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
              title: "Alignment Gap",
              desc: "Analyzes requirements line-by-line relative to your real-world exposure, highlighting steps to tune."
            },
            {
              icon: <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
              title: "Guided Roadmaps",
              desc: "Generates custom tactical assignments, mock challenges, and learning guides to ramp up fast."
            },
            {
              icon: <Award className="w-6 h-6 text-amber-500" />,
              title: "Interview Prep",
              desc: "AI modules simulate actual screening conversations for your exact path, producing contextual feedback."
            }
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/30 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all group relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-100/50 dark:bg-slate-800/30 rounded-full blur-[20px] group-hover:scale-150 transition-transform duration-500" />
              <div className="w-14 h-14 bg-white dark:bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700/50 group-hover:scale-110 transition-transform shadow-sm relative z-10">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">{feat.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal relative z-10">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 4: Success Stories (Real Testimonials) */}
      <section className="relative z-10 container mx-auto px-6 py-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800/30 max-w-6xl my-16 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-xs bg-emerald-100/50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-md">
            Verified Success
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 mb-4 leading-tight">
            Proven Career-Bridge Outcomes
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-normal">
            Real success stories of career transitions accomplished through diagnostic clarity and preparation.
          </p>
        </motion.div>

        {loadingTestimonials ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-500">Loading verified outcomes...</p>
          </div>
        ) : testimonials.length > 0 ? (
          <>
          <div 
            className="relative group/scroller"
            onMouseEnter={() => setIsTestimonialHovered(true)}
            onMouseLeave={() => setIsTestimonialHovered(false)}
            onTouchStart={() => setIsTestimonialHovered(true)}
            onTouchEnd={() => setIsTestimonialHovered(false)}
          >
            <div 
              ref={testimonialScrollRef}
              className="flex overflow-x-auto gap-6 pb-8 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {loopedTestimonials.map((testi, idx) => (
                <motion.div
                  key={`${testi.id || 't'}-${idx}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5 }}
                  className="shrink-0 w-[85vw] md:w-[400px] p-8 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between shadow-sm relative hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                <div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${(testi.rating || 5) > i ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-800 dark:text-slate-800'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium whitespace-normal">
                    "{testi.content}"
                  </p>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0`}>
                    {testi.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{testi.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {testi.role} {testi.company && <span>at <span className="font-semibold text-slate-900 dark:text-white">{testi.company}</span></span>}
                    </p>
                  </div>
                </div>
              </motion.div>
              ))}
            </div>
            {testimonials.length > 3 && (
              <>
                <button 
                  onClick={() => {
                    if (testimonialScrollRef.current) testimonialScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-700 z-10 hidden md:flex"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    if (testimonialScrollRef.current) testimonialScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-700 z-10 hidden md:flex"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {!hasSharedTestimonial && (
            <div className="mt-12 text-center flex flex-col items-center">
              <button
                onClick={user ? () => setIsTestimonialModalOpen(true) : onLoginClick}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 shadow-md flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                {user ? 'Submit Your Story' : 'Sign in to Submit Story'}
              </button>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Join others in sharing how SkillBridge helped your career.</p>
            </div>
          )}
        </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Award className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Be the First to Assure Our Service</h3>
            <p className="text-base text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
              We haven't received any verified testimonials yet. If SkillBridge has helped you map out your career, share your story to inspire others.
            </p>
            {!hasSharedTestimonial && (
              <button
                onClick={user ? () => setIsTestimonialModalOpen(true) : onLoginClick}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 shadow-md flex items-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                {user ? 'Submit Your Story' : 'Sign in to Submit Story'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Submit Testimonial Modal */}
      <SubmitTestimonialModal 
        isOpen={isTestimonialModalOpen}
        onClose={() => setIsTestimonialModalOpen(false)}
        darkMode={darkMode}
        user={user}
        onSuccess={() => setHasSharedTestimonial(true)}
      />

      {/* Section 5: How It Works */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Four Steps to Onboard Your Future</h2>
          <p className="text-slate-500 dark:text-slate-400 font-normal font-sans text-lg">We make career transition a logical science, not a gamble.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto relative font-normal">
          {[
            { step: "01", title: "Feed Profile", desc: "Instantly feed in resume, credentials, or custom skills list." },
            { step: "02", title: "Map Target Goal", desc: "Input target company, exact job role, or desired position." },
            { step: "03", title: "Cross-Diagnostics", desc: "We run deep reasoning engines to calculate complete misalignment gaps." },
            { step: "04", title: "Acquire Roadmap", desc: "Unlock precise action roadmaps, targeted preparation resources, and score guides." }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-8 rounded-3xl relative hover:-translate-y-1 transition-all hover:shadow-lg"
            >
              <div className="absolute -top-3 -right-3 text-3xl font-black text-purple-600/20 dark:text-purple-400/20 drop-shadow-sm select-none">{item.step}</div>
              <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold mb-4 shadow-sm">{idx + 1}</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 relative z-10">{item.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal relative z-10">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

    {/* Section 6: Interactive FAQ Section (Accordion) */}
      <section className="relative z-10 container mx-auto px-6 py-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl max-w-4xl my-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-950/30 rounded-2xl text-indigo-600 dark:text-indigo-400 mb-3 mx-auto">
            <HelpCircle className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">Frequently Clarified Inquiries</h2>
          <p className="text-slate-500 dark:text-slate-400 font-normal">Everything you need to understand regarding SkillBridge diagnostics.</p>
        </motion.div>

        <div className="space-y-4 font-normal">
          {[
            {
              q: "How does the SkillBridge diagnostic algorithm evaluate profile gaps?",
              a: "SkillBridge uses premium semantic reasoning models via Google Gemini API to scan the text nodes of your resume, identifying both explicit credentials and structural competencies. It then maps these against target benchmarks you submit, measuring alignment matrices seamlessly."
            },
            {
              q: "Is there raw data encryption of uploaded resumes?",
              a: "Absolutely. All resumes, profiles, names, and analysis scores are saved on secure Firestore backends, separated per account. Your documents are processed server-side with no persistent third-party training usage."
            },
            {
              q: "How does the system calculate the final Alignment Score?",
              a: "Our diagnostic score evaluates multiple layers: foundational skills, architecture experience levels, technical tools matching, and leadership indicators. Gap severity weights are generated recursively to formulate the percentage rating."
            },
            {
              q: "Are the training milestones customizable to my speed?",
              a: "Yes! Every step outputted on the active roadmap is structured as an interactive milestone. You can view custom details, read focused guides, and trace progress at your own executive pace."
            }
          ].map((faq, idx) => (
            <div 
              key={idx}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20"
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-bold text-sm sm:text-base flex items-center justify-between text-slate-900 dark:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-colors focus:outline-none hover:cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedFaq === idx ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {expandedFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mx-5 mb-5 p-5 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal shadow-xs">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: Final High-Energy CTA */}
      <section className="relative z-10 container mx-auto px-6 py-24 text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
          className="p-12 md:p-16 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-955 bg-indigo-950 to-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Stop Guessing. Discover Your Exact Match Alignment Now.
          </h2>
          <p className="text-slate-300 dark:text-slate-404 text-slate-400 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Take less than 2 minutes to upload your professional background and isolate exactly what stands between you and your top target companies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button 
              onClick={onTryDemo}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-full font-bold text-lg transition-transform hover:-translate-y-1 shadow-lg hover:cursor-pointer"
            >
              Start New Analysis
            </button>
            {!user && (
              <button 
                onClick={onSignupClick}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-lg transition-transform hover:-translate-y-1 shadow-lg hover:cursor-pointer"
              >
                Create Unlimited Profile
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Footer / Credits */}
      <footer className="relative z-10 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-lg py-10 mt-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Logo darkMode={darkMode} size="md" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Formulated with precision ❤️ by SkillBridge Team
          </p>
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} SkillBridge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

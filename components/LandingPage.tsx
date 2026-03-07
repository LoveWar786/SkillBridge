import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, FileText, Users, Zap, CheckCircle2, Shield, Sparkles, Moon, Sun, LayoutDashboard, History, LogOut, Settings, Plus, Download, Trash2 } from 'lucide-react';
import { User } from '../services/authService';
import { AnalysisHistoryItem } from '../types';

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
  onSettingsClick
}) => {
  // Stats counters
  const [users, setUsers] = useState(0);
  const [cvs, setCvs] = useState(0);

  useEffect(() => {
    // Animate counters
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setUsers(Math.floor((12450 / steps) * currentStep));
      setCvs(Math.floor((5230 / steps) * currentStep));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setUsers(12450);
        setCvs(5230);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden relative selection:bg-blue-500/30">
        {/* Navbar for Logged In User */}
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">SkillBridge</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.credits} Credits</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={onSettingsClick}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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

        <main className="container mx-auto px-6 py-12 relative z-10">
          {/* Welcome Header */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user.name}!</h1>
            <p className="text-slate-500 dark:text-slate-400">Here's what's happening with your career journey.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">All Time</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{history.length}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Analyses</p>
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

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Start New Analysis</h3>
                <p className="text-blue-100 text-sm mb-6">Analyze a new job role and get a personalized learning path.</p>
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

          {/* Analysis History */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <History className="w-5 h-5 text-slate-500" />
                </div>
                <h2 className="text-xl font-bold">Analysis History</h2>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {history.length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Role & Company</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Score</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.jobRole}</p>
                            {item.companyName && (
                              <p className="text-sm text-slate-500">{item.companyName}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
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
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              View Report
                            </button>
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
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No analyses yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Start your first job analysis to see your history here.</p>
                  <button 
                    onClick={onTryDemo}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
                  >
                    Start Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden relative selection:bg-blue-500/30">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-emerald-400/20 dark:bg-emerald-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">SkillBridge</span>
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
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200 dark:border-blue-800/50">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Advanced AI Reasoning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Bridge the Gap Between Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Skills</span> and Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">Dream Job</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Upload your CV, select your target role, and let our deep-thinking AI analyze your employability, identify skill gaps, and provide actionable career paths.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onTryDemo}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-lg shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Try Demo Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onSignupClick}
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5 text-slate-400" />
              Create Free Account
            </button>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="p-6 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {users.toLocaleString()}+
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Active Users</p>
          </div>
          
          <div className="p-6 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {cvs.toLocaleString()}+
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">CVs Parsed Daily</p>
          </div>

          <div className="p-6 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              98%
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Analysis Accuracy</p>
          </div>
        </motion.div>
      </main>

      {/* Footer / Credits */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-lg py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            <span className="font-bold text-slate-900 dark:text-white">SkillBridge</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Built with ❤️ by SkillBridge Team
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

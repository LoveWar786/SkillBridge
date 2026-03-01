import React, { useState, useEffect } from 'react';
import { AppStep, UserProfile, JobContext, AnalysisResult } from './types';
import { analyzeJobReadiness } from './services/geminiService';
import StepUpload from './components/StepUpload';
import StepProfile from './components/StepProfile';
import StepJob from './components/StepJob';
import StepAnalysis from './components/StepAnalysis';
import ChatWidget from './components/ChatWidget';
import { Loader2, Zap, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  // Handlers for step transitions
  const handleProfileLoaded = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setCurrentStep(AppStep.PROFILE_REVIEW);
  };

  const handleProfileConfirmed = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setCurrentStep(AppStep.JOB_SELECTION);
  };

  const handleJobAnalysis = async (context: JobContext) => {
    if (!profile) return;
    setJobContext(context);
    setIsAnalyzing(true);
    setCurrentStep(AppStep.ANALYZING);

    try {
      const result = await analyzeJobReadiness(profile, context);
      setAnalysisResult(result);
      setCurrentStep(AppStep.RESULTS);
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please try again.");
      setCurrentStep(AppStep.JOB_SELECTION);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setProfile(null);
    setJobContext(null);
    setAnalysisResult(null);
    setCurrentStep(AppStep.UPLOAD);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
      
      {/* Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer group" onClick={handleReset}>
            <Zap className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">SkillBridge</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              AI-Powered Career Readiness
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Progress Indicator */}
        {currentStep !== AppStep.RESULTS && currentStep !== AppStep.ANALYZING && (
           <div className="flex justify-center mb-12">
              <div className="flex items-center gap-4 text-sm font-medium">
                  <span className={`${currentStep === AppStep.UPLOAD ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>1. Skills Input</span>
                  <span className="text-slate-300 dark:text-slate-700">→</span>
                  <span className={`${currentStep === AppStep.PROFILE_REVIEW ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>2. Review</span>
                  <span className="text-slate-300 dark:text-slate-700">→</span>
                  <span className={`${currentStep === AppStep.JOB_SELECTION ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>3. Target Role</span>
              </div>
           </div>
        )}

        {/* Dynamic Content */}
        {currentStep === AppStep.UPLOAD && (
          <StepUpload onProfileLoaded={handleProfileLoaded} />
        )}

        {currentStep === AppStep.PROFILE_REVIEW && profile && (
          <StepProfile 
            profile={profile} 
            onConfirm={handleProfileConfirmed}
            onBack={() => setCurrentStep(AppStep.UPLOAD)} 
          />
        )}

        {currentStep === AppStep.JOB_SELECTION && (
          <StepJob 
            onAnalyze={handleJobAnalysis}
            onBack={() => setCurrentStep(AppStep.PROFILE_REVIEW)}
          />
        )}

        {currentStep === AppStep.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center space-y-6">
            <div className="relative">
                 <div className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
                 <div className="w-24 h-24 rounded-full border-4 border-blue-600 dark:border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-blue-600 dark:text-blue-500 fill-blue-600 dark:fill-blue-500 animate-pulse" />
                 </div>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analyzing Employability...</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                    Our AI is reasoning through your skills against the {jobContext?.role} requirements. 
                    This uses deep thinking models and might take a moment.
                </p>
            </div>
          </div>
        )}

        {currentStep === AppStep.RESULTS && analysisResult && (
          <StepAnalysis 
            result={analysisResult} 
            candidateName={profile?.fullName}
            experienceYears={profile?.experienceYears}
            onReset={handleReset} 
          />
        )}

      </main>

      {/* Floating Chatbot */}
      <ChatWidget />

    </div>
  );
};

export default App;
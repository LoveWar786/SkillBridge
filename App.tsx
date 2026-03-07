import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppStep, UserProfile, JobContext, AnalysisResult, AnalysisHistoryItem } from './types';
import { analyzeJobReadiness } from './services/geminiService';
import { authService, User } from './services/authService';
import { historyService } from './services/historyService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import StepUpload from './components/StepUpload';
import StepProfile from './components/StepProfile';
import StepJob from './components/StepJob';
import StepAnalysis from './components/StepAnalysis';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import ProfileEditModal from './components/ProfileEditModal';
import CreditPurchaseModal from './components/CreditPurchaseModal';
import LandingPage from './components/LandingPage';
import { Loader2, Zap, Moon, Sun, Coins, LogIn, User as UserIcon, LogOut, Settings, Plus, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import ErrorMessage from './components/ErrorMessage';
import ConfirmationModal from './components/ConfirmationModal';
import NotificationToast from './components/NotificationToast';
import OnboardingModal from './components/OnboardingModal';
import { AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  // Auth & Credits State
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [guestCredits, setGuestCredits] = useState(2); // Default trial credits for guests
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialView, setAuthModalInitialView] = useState<'login' | 'register'>('login');
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [isCreditPurchaseModalOpen, setIsCreditPurchaseModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [emailChangeNotification, setEmailChangeNotification] = useState<{old: string, new: string} | null>(null);
  const [nameChangeNotification, setNameChangeNotification] = useState<{old: string, new: string} | null>(null);
  const pendingEmailRef = useRef<string | undefined>(undefined);

  // Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    pendingEmailRef.current = user?.pendingEmail;
    
    // Check for onboarding
    if (user && user.onboardingCompleted === false) {
      setIsOnboardingModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    // Check local storage or system preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    // Initialize Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch additional data from Firestore
        const userData = await authService.getUserData(firebaseUser.uid);
        if (userData) {
          setUser(userData);
          // Fetch history
          const userHistory = await historyService.getUserHistory(userData.uid);
          setHistory(userHistory);
        } else {
          // Fallback if firestore doc missing (shouldn't happen with correct flow)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            credits: 0,
            emailVerified: firebaseUser.emailVerified
          });
        }
      } else {
        // User is signed out
        if (pendingEmailRef.current) {
          // We are likely in the middle of an email change which revokes the session.
          // Delay the logout to give the background poller a chance to re-authenticate.
          setTimeout(() => {
            if (!auth.currentUser) {
              setUser(null);
              const storedGuestCredits = localStorage.getItem('skillbridge_guest_credits');
              if (storedGuestCredits) {
                setGuestCredits(parseInt(storedGuestCredits, 10));
              } else {
                localStorage.setItem('skillbridge_guest_credits', '2');
              }
            }
          }, 5000);
        } else {
          setUser(null);
          // Load guest credits
          const storedGuestCredits = localStorage.getItem('skillbridge_guest_credits');
          if (storedGuestCredits) {
            setGuestCredits(parseInt(storedGuestCredits, 10));
          } else {
            localStorage.setItem('skillbridge_guest_credits', '2');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Poll for email verification
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkVerification = async () => {
      if (user && user.emailVerified === false) {
        try {
          const updatedUser = await authService.checkInitialEmailVerification(user.uid);
          if (updatedUser) {
            setUser(updatedUser);
            setShowVerificationAlert(true);
            setTimeout(() => setShowVerificationAlert(false), 5000);
          }
        } catch (error) {
          console.error("Error checking verification:", error);
        }
      }
    };

    if (user && user.emailVerified === false) {
      interval = setInterval(checkVerification, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  // Poll for pending email change verification
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkPendingEmail = async () => {
      if (user && user.pendingEmail) {
        try {
          const result = await authService.checkEmailVerification(user.uid) as User & { _emailChanged?: boolean, _oldEmail?: string };
          if (result && result._emailChanged) {
            handleProfileUpdateSuccess(result, undefined, result._oldEmail);
          }
        } catch (error: any) {
          // Ignore token expired errors during polling to prevent logout
          if (error.code !== 'auth/user-token-expired') {
            console.error("Error checking pending email:", error);
          }
        }
      }
    };

    if (user && user.pendingEmail) {
      interval = setInterval(checkPendingEmail, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user?.pendingEmail, user?.uid]);

  useEffect(() => {
    // Removed automatic redirect to /app for logged in users
  }, [user, location.pathname, navigate]);

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

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    const userHistory = await historyService.getUserHistory(loggedInUser.uid);
    setHistory(userHistory);
    // Stay on homepage or current page
  };

  const handleProfileUpdateSuccess = (updatedUser: User, oldName?: string, oldEmail?: string) => {
    setUser(updatedUser);
    if (oldName && oldName !== updatedUser.name) {
      setNameChangeNotification({ old: oldName, new: updatedUser.name });
      setTimeout(() => setNameChangeNotification(null), 5000);
    }
    if (oldEmail && oldEmail !== updatedUser.email) {
      setEmailChangeNotification({ old: oldEmail, new: updatedUser.email });
      setTimeout(() => setEmailChangeNotification(null), 5000);
    }
  };

  const handlePurchaseSuccess = (updatedUser: User) => {
    setUser(updatedUser);
    // Modal closes itself or stays open for a moment, handled within the component
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setHistory([]);
    navigate('/');
    // Re-read guest credits
    const storedGuestCredits = localStorage.getItem('skillbridge_guest_credits');
    if (storedGuestCredits) {
      setGuestCredits(parseInt(storedGuestCredits, 10));
    }
    handleReset();
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

    const currentCredits = user ? user.credits : guestCredits;
    
    // Determine cost based on model speed
    let cost = 2; // Default fastest
    if (context.modelSpeed === 'balanced') cost = 3;
    if (context.modelSpeed === 'deep') cost = 5;

    if (currentCredits < cost) {
      if (!user) {
        // Prompt guest to login/register for more credits
        setIsAuthModalOpen(true);
        return;
      }
      // If user is logged in but insufficient credits, prompt to buy
      if (confirm(`Insufficient credits! You need ${cost} credits but have ${currentCredits}. Would you like to buy more?`)) {
        setIsCreditPurchaseModalOpen(true);
      }
      return;
    }

    // Deduct credits
    const newCredits = currentCredits - cost;
    if (user) {
      try {
        await authService.updateUserCredits(user.uid, newCredits);
        setUser({ ...user, credits: newCredits });
      } catch (error) {
        console.error("Failed to update credits:", error);
        // Don't update UI if server update fails
        return;
      }
    } else {
      setGuestCredits(newCredits);
      localStorage.setItem('skillbridge_guest_credits', newCredits.toString());
    }

    setJobContext(context);
    setIsAnalyzing(true);
    setCurrentStep(AppStep.ANALYZING);

    try {
      const result = await analyzeJobReadiness(profile, context);
      setAnalysisResult(result);
      
      // Save history if logged in
      if (user) {
        await historyService.saveAnalysis(user.uid, result, context.role, context.companyName);
        // Refresh history
        const updatedHistory = await historyService.getUserHistory(user.uid);
        setHistory(updatedHistory);
      }

      setCurrentStep(AppStep.RESULTS);
    } catch (error: any) {
      console.error(error);
      setAppError(error.message || "Analysis failed. Please try again.");
      
      // Refund credits
      const refunded = newCredits + cost;
      if (user) {
        authService.updateUserCredits(user.uid, refunded);
        setUser({ ...user, credits: refunded });
      } else {
        setGuestCredits(refunded);
        localStorage.setItem('skillbridge_guest_credits', refunded.toString());
      }
      
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

  const displayCredits = user ? user.credits : guestCredits;

  const handleViewHistory = (item: AnalysisHistoryItem) => {
    setAnalysisResult(item.result);
    // Set context partially if possible, or just for display
    setJobContext({
      role: item.jobRole,
      type: item.companyName ? 'CompanySpecific' : 'Generalized',
      companyName: item.companyName,
      modelSpeed: 'balanced' // Default
    });
    // We might not have the full profile object if we didn't save it, 
    // but StepAnalysis mainly needs the result.
    // However, StepAnalysis uses candidateName from profile.
    // We can mock it or use user name.
    if (!profile && user) {
        setProfile({
            fullName: user.name,
            skills: [], // We don't have skills from history yet unless we save them
            experienceYears: 0
        });
    }
    
    setCurrentStep(AppStep.RESULTS);
    navigate('/app');
  };

  const handleDeleteHistory = async (itemId: string) => {
    setItemToDelete(itemId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !itemToDelete) return;
    
    try {
      await historyService.deleteAnalysis(itemToDelete);
      setHistory(prev => prev.filter(item => item.id !== itemToDelete));
      setNotification({ message: 'Analysis deleted successfully', type: 'success' });
    } catch (error: any) {
      console.error("Failed to delete analysis:", error);
      setNotification({ message: `Failed to delete analysis: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleOnboardingComplete = async (data: { name?: string, experienceYears?: number }) => {
    if (!user) return;

    try {
      if (data.name && data.name !== user.name) {
         await authService.updateOnboardingData(user.uid, data.name);
      } else {
         await authService.completeOnboarding(user.uid);
      }
      
      if (data.experienceYears !== undefined) {
        setProfile(prev => ({
          ...prev,
          fullName: data.name || user.name,
          experienceYears: data.experienceYears,
          skills: prev?.skills || []
        }));
      }

      setUser(prev => prev ? { ...prev, onboardingCompleted: true, name: data.name || prev.name } : null);
      setIsOnboardingModalOpen(false);
      setNotification({ message: "Profile setup complete! You earned 10 credits.", type: 'success' });
    } catch (error) {
      console.error("Onboarding error:", error);
      setNotification({ message: "Failed to save profile.", type: 'error' });
    }
  };

  const mainAppContent = (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-300">
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess} 
        initialView={authModalInitialView}
      />

      {user && (
        <>
          <OnboardingModal
            isOpen={isOnboardingModalOpen}
            onClose={() => setIsOnboardingModalOpen(false)}
            onComplete={handleOnboardingComplete}
            user={user}
          />
          <ProfileEditModal
            isOpen={isProfileEditModalOpen}
            onClose={() => setIsProfileEditModalOpen(false)}
            currentUser={user}
            onUpdateSuccess={handleProfileUpdateSuccess}
          />
          <CreditPurchaseModal
            isOpen={isCreditPurchaseModalOpen}
            onClose={() => setIsCreditPurchaseModalOpen(false)}
            currentUser={user}
            onPurchaseSuccess={handlePurchaseSuccess}
          />
        </>
      )}

      {/* Verification Banner */}
      {user && user.emailVerified === false && (
        <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <span>Please verify your email address to receive your 10 free credits. Check your inbox (and spam folder).</span>
        </div>
      )}

      {/* Verification Success Popup */}
      {showVerificationAlert && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 border border-emerald-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg leading-tight">Email Verified!</p>
            <p className="text-emerald-50 text-sm">You have received 10 free credits.</p>
          </div>
        </div>
      )}

      {/* Email Change Success Popup */}
      {emailChangeNotification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 border border-emerald-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg leading-tight">Email Changed!</p>
            <p className="text-emerald-50 text-sm">Email Changed from {emailChangeNotification.old} to {emailChangeNotification.new}!</p>
          </div>
        </div>
      )}

      {/* Name Change Success Popup */}
      {nameChangeNotification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 border border-emerald-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg leading-tight">Name Changed!</p>
            <p className="text-emerald-50 text-sm">Name Changed from {nameChangeNotification.old} to {nameChangeNotification.new}!</p>
          </div>
        </div>
      )}

      {/* Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer group" onClick={handleReset}>
              <Zap className="w-6 h-6 sm:w-7 sm:h-7 fill-current group-hover:scale-110 transition-transform flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white leading-none">SkillBridge</span>
                <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">AI-Powered Career Analysis</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
              displayCredits < 2 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }`}>
              <Coins className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{displayCredits} <span className="hidden sm:inline">Credits</span></span>
              {user && (
                <button 
                  onClick={() => setIsCreditPurchaseModalOpen(true)}
                  className="ml-1 p-0.5 bg-amber-200 dark:bg-amber-800 rounded-full hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors"
                  title="Buy Credits"
                >
                  <Plus className="w-3 h-3 text-amber-800 dark:text-amber-200" />
                </button>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-3 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pro Member</span>
                </div>
                <button 
                  onClick={() => setIsProfileEditModalOpen(!isProfileEditModalOpen)}
                  className="hidden sm:block p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Profile"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login / Register</span>
              </button>
            )}

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

      {/* Mobile Bottom Navigation Bar */}
      {user && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-4 py-3 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.name}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Pro Member</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
              displayCredits < 2 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              <Coins className="w-3 h-3" />
              <span>{displayCredits}</span>
            </div>
            
            <button 
              onClick={() => setIsProfileEditModalOpen(!isProfileEditModalOpen)}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Edit Profile"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 sm:pb-12">
        
        {appError && (
          <div className="mb-8">
            <ErrorMessage 
              title="Analysis Error"
              message={appError}
              variant="error"
              onClose={() => setAppError(null)}
              solutions={[
                "Try selecting a 'Balanced' or 'Fastest' model speed",
                "Ensure your profile information is complete",
                "Check your internet connection"
              ]}
            />
          </div>
        )}

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
            credits={displayCredits}
            onBuyCredits={() => setIsCreditPurchaseModalOpen(true)}
            isGuest={!user}
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
      {!isProfileEditModalOpen && !isCreditPurchaseModalOpen && !isAuthModalOpen && (
        <ChatWidget />
      )}

    </div>
  );

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <>
            <LandingPage 
              onTryDemo={() => navigate('/app')} 
              onLoginClick={() => {
                setAuthModalInitialView('login');
                setIsAuthModalOpen(true);
              }}
              onSignupClick={() => {
                setAuthModalInitialView('register');
                setIsAuthModalOpen(true);
              }}
              onBuyCredits={() => setIsCreditPurchaseModalOpen(true)}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              user={user}
              onLogout={handleLogout}
              history={history}
              onViewHistory={handleViewHistory}
              onDeleteHistory={handleDeleteHistory}
              onSettingsClick={() => setIsProfileEditModalOpen(true)}
            />
            <AuthModal 
              isOpen={isAuthModalOpen} 
              onClose={() => setIsAuthModalOpen(false)} 
              onLoginSuccess={handleLoginSuccess}
              initialView={authModalInitialView}
            />
            {user && (
              <>
                <ProfileEditModal
                  isOpen={isProfileEditModalOpen}
                  onClose={() => setIsProfileEditModalOpen(false)}
                  currentUser={user}
                  onUpdateSuccess={handleProfileUpdateSuccess}
                />
                <CreditPurchaseModal
                  isOpen={isCreditPurchaseModalOpen}
                  onClose={() => setIsCreditPurchaseModalOpen(false)}
                  currentUser={user}
                  onPurchaseSuccess={handlePurchaseSuccess}
                />
                <ConfirmationModal
                  isOpen={isDeleteModalOpen}
                  onClose={() => setIsDeleteModalOpen(false)}
                  onConfirm={handleConfirmDelete}
                  title="Delete Analysis"
                  message="Are you sure you want to delete this analysis? This action cannot be undone."
                  confirmText="Delete"
                  isDangerous={true}
                />
              </>
            )}
            <AnimatePresence>
              {notification && (
                <NotificationToast
                  message={notification.message}
                  type={notification.type}
                  onClose={() => setNotification(null)}
                />
              )}
            </AnimatePresence>
          </>
        } 
      />
      <Route path="/app/*" element={mainAppContent} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
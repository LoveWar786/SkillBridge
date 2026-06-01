import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppStep, UserProfile, JobContext, AnalysisResult, AnalysisHistoryItem, Draft } from './types';
import { analyzeJobReadiness } from './services/geminiService';
import { authService, User } from './services/authService';
import { historyService } from './services/historyService';
import { draftService } from './services/draftService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import StepUpload from './components/StepUpload';
import StepProfile from './components/StepProfile';
import StepJob from './components/StepJob';
import StepAnalysis from './components/StepAnalysis';
import SharedResultPage from './components/SharedResultPage';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import ProfileEditModal from './components/ProfileEditModal';
import CreditPurchaseModal from './components/CreditPurchaseModal';
import LandingPage from './components/LandingPage';
import { Loader2, Zap, Moon, Sun, Coins, LogIn, LogOut, Settings, Plus, AlertCircle, ArrowLeft, BrainCircuit, AlertTriangle, BookOpen, Briefcase } from 'lucide-react';
import ErrorMessage from './components/ErrorMessage';
import ConfirmationModal from './components/ConfirmationModal';
import OnboardingModal from './components/OnboardingModal';
import Logo from './components/Logo';
import { useNotification } from './contexts/NotificationContext';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | undefined>(undefined);
  const [currentAnalysisHasFeedback, setCurrentAnalysisHasFeedback] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [analysisCost, setAnalysisCost] = useState<number | undefined>(undefined);
  const [darkMode, setDarkMode] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  
  // Auth & Credits State
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [guestCredits, setGuestCredits] = useState(2); // Default trial credits for guests
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialView, setAuthModalInitialView] = useState<'login' | 'register'>('login');
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [isCreditPurchaseModalOpen, setIsCreditPurchaseModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const pendingEmailRef = useRef<string | undefined>(undefined);

  // Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleteDraftModalOpen, setIsDeleteDraftModalOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [isSaveDraftModalOpen, setIsSaveDraftModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{ profile: UserProfile, context?: JobContext } | null>(null);
  
  const { showNotification } = useNotification();

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
          // Update last visited
          authService.updateLastVisited(firebaseUser.uid).catch(console.error);
          userData.lastVisited = Date.now();
          
          setUser(prevUser => {
            // If prevUser already has a newer lastLogin, keep it to prevent race conditions
            if (prevUser && prevUser.lastLogin && userData.lastLogin && prevUser.lastLogin > userData.lastLogin) {
              userData.lastLogin = prevUser.lastLogin;
            }
            return userData;
          });
          // Fetch history
          const userHistory = await historyService.getUserHistory(userData.uid);
          setHistory(userHistory);
          // Fetch drafts
          const userDrafts = await draftService.getUserDrafts(userData.uid);
          setDrafts(userDrafts);
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
            showNotification('Email Verified! You have received 10 free credits.', 'success');
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

  // Keyboard shortcuts listener for accessibility and speed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ALT + N: Start a new analysis
      if (e.altKey && e.key.toLowerCase() === 'n') {
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).isContentEditable
        );
        if (!isInputField) {
          e.preventDefault();
          handleNewAnalysis();
          showNotification('New Analysis triggered, starting fresh! [Alt + N]', 'success');
        }
      }
      
      // ALT + H: Scroll or navigate to history
      if (e.altKey && e.key.toLowerCase() === 'h') {
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).isContentEditable
        );
        if (!isInputField) {
          e.preventDefault();
          if (location.pathname !== '/') {
            navigate('/');
            sessionStorage.setItem('scroll_to_history', 'true');
          } else {
            const element = document.getElementById('analysis-history-section');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              showNotification('Scrolled to Analysis History [Alt + H]', 'success');
            } else {
              showNotification('Scroll failed: Already on dashboard board.', 'info');
            }
          }
        }
      }

      // ALT + T: Toggle Dark/Light Theme
      if (e.altKey && e.key.toLowerCase() === 't') {
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).isContentEditable
        );
        if (!isInputField) {
          e.preventDefault();
          toggleDarkMode();
          showNotification(`Theme toggled dynamically to ${!darkMode ? 'Dark' : 'Light'} Mode! [Alt + T]`, 'success');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [location.pathname, navigate, user, darkMode]);

  // Handle automatic scrolling to history when transitioning routes
  useEffect(() => {
    if (sessionStorage.getItem('scroll_to_history') === 'true') {
      sessionStorage.removeItem('scroll_to_history');
      setTimeout(() => {
        const element = document.getElementById('analysis-history-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          showNotification('Navigated to History [Alt + H]', 'success');
        }
      }, 500);
    }
  }, [location.pathname]);

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
    const userDrafts = await draftService.getUserDrafts(loggedInUser.uid);
    setDrafts(userDrafts);
    if (window.location.pathname === '/') {
      navigate('/dashboard');
    }
  };

  const handleProfileUpdateSuccess = (updatedUser: User, oldName?: string, oldEmail?: string) => {
    setUser(updatedUser);
    if (oldName && oldName !== updatedUser.name) {
      showNotification(`Name changed from ${oldName} to ${updatedUser.name}`, 'success');
    }
    if (oldEmail && oldEmail !== updatedUser.email) {
      showNotification(`Email changed from ${oldEmail} to ${updatedUser.email}`, 'success');
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
    setDrafts([]);
    setCurrentDraftId(undefined);
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

    // Show loading state immediately for better responsiveness
    setCurrentStep(AppStep.ANALYZING);

    const currentCredits = user ? user.credits : guestCredits;
    
    // Determine cost based on model speed
    let cost = 2; // Default fastest
    if (context.modelSpeed === 'balanced') cost = 3;
    if (context.modelSpeed === 'deep') cost = 5;

    if (currentCredits < cost) {
      setCurrentStep(AppStep.JOB_SELECTION);
      
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
        setCurrentStep(AppStep.JOB_SELECTION);
        // Don't update UI if server update fails
        return;
      }
    } else {
      setGuestCredits(newCredits);
      localStorage.setItem('skillbridge_guest_credits', newCredits.toString());
    }

    setJobContext(context);

    // Auto-save user's progress of profile and context as a draft before running the async analysis
    let autoSavedDraftId = currentDraftId;
    if (user) {
      try {
        autoSavedDraftId = await draftService.saveDraft(
          user.uid,
          profile,
          AppStep.JOB_SELECTION,
          context,
          currentDraftId
        );
        setCurrentDraftId(autoSavedDraftId);
        const updatedDrafts = await draftService.getUserDrafts(user.uid);
        setDrafts(updatedDrafts);
      } catch (draftError) {
        console.error("Failed to auto-save draft prior to analysis:", draftError);
      }
    }

    try {
      const { result, modelUsed: usedModel } = await analyzeJobReadiness(profile, context);
      setAnalysisResult(result);
      setModelUsed(usedModel);
      setAnalysisCost(cost);
      
      // Save history if logged in
      if (user) {
        const newAnalysisId = await historyService.saveAnalysis(
          user.uid, 
          result, 
          context.role, 
          context.companyName,
          profile.fullName,
          profile.experienceYears,
          usedModel,
          cost
        );
        setCurrentAnalysisId(newAnalysisId);
        setCurrentAnalysisHasFeedback(false);
        
        // Refresh history
        const updatedHistory = await historyService.getUserHistory(user.uid);
        setHistory(updatedHistory);

        // Delete draft if one was used or auto-saved
        const draftIdToDelete = currentDraftId || autoSavedDraftId;
        if (draftIdToDelete) {
          try {
            await draftService.deleteDraft(draftIdToDelete);
            const updatedDrafts = await draftService.getUserDrafts(user.uid);
            setDrafts(updatedDrafts);
            setCurrentDraftId(undefined);
          } catch (draftError) {
            console.error("Failed to delete completed draft:", draftError);
          }
        }
      } else {
        setCurrentAnalysisId(undefined);
        setCurrentAnalysisHasFeedback(false);
      }

      setCurrentStep(AppStep.RESULTS);
      showNotification('Analysis completed successfully!', 'success');
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
    }
  };

  const handleReset = () => {
    setProfile(null);
    setJobContext(null);
    setAnalysisResult(null);
    setCurrentDraftId(undefined);
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
    
    // Set profile from history item if available, otherwise fallback to user data
    setProfile({
        fullName: item.candidateName || user?.name,
        skills: [], // We don't have skills from history yet unless we save them
        experienceYears: item.experienceYears !== undefined ? item.experienceYears : 0,
        summary: ''
    });
    
    setModelUsed(item.modelUsed);
    setAnalysisCost(item.cost);
    setCurrentAnalysisId(item.id);
    setCurrentAnalysisHasFeedback(!!item.feedback);
    setCurrentDraftId(undefined);
    setCurrentStep(AppStep.RESULTS);
    navigate('/app');
  };

  const handleSaveDraft = async (currentProfile: UserProfile, currentJobContext?: JobContext, isAutoSave: boolean = false) => {
    if (!user) {
      if (!isAutoSave) {
        setAuthModalInitialView('register');
        setIsAuthModalOpen(true);
        showNotification('Please log in to save your progress as a draft.', 'info');
      }
      return;
    }

    if (isAutoSave) {
      if (isSavingDraft) return; // Prevent overlapping saves
      try {
        const draftId = await draftService.saveDraft(
          user.uid,
          currentProfile,
          currentStep,
          currentJobContext,
          currentDraftId
        );
        setCurrentDraftId(draftId);
        
        // Refresh drafts without showing notification modal
        const updatedDrafts = await draftService.getUserDrafts(user.uid);
        setDrafts(updatedDrafts);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
      return;
    }

    setPendingSaveData({ profile: currentProfile, context: currentJobContext });
    setIsSaveDraftModalOpen(true);
  };

  const handleConfirmSaveDraft = async () => {
    if (!user || !pendingSaveData) return;

    setIsSavingDraft(true);
    setIsSaveDraftModalOpen(false);
    try {
      const draftId = await draftService.saveDraft(
        user.uid,
        pendingSaveData.profile,
        currentStep,
        pendingSaveData.context,
        currentDraftId
      );
      setCurrentDraftId(draftId);
      
      // Refresh drafts
      const updatedDrafts = await draftService.getUserDrafts(user.uid);
      setDrafts(updatedDrafts);
      
      showNotification('Progress saved as draft!', 'success');
    } catch (error: any) {
      console.error("Failed to save draft:", error);
      showNotification('Failed to save draft.', 'error');
    } finally {
      setIsSavingDraft(false);
      setPendingSaveData(null);
    }
  };

  const handleResumeDraft = (draft: Draft) => {
    setProfile(draft.profile);
    setJobContext(draft.jobContext || null);
    setCurrentStep(draft.step);
    setCurrentDraftId(draft.id);
    navigate('/app');
    showNotification('Draft resumed!', 'success');
  };

  const handleDeleteDraft = (draftId: string) => {
    setDraftToDelete(draftId);
    setIsDeleteDraftModalOpen(true);
  };

  const handleConfirmDeleteDraft = async () => {
    if (!user || !draftToDelete) return;
    try {
      await draftService.deleteDraft(draftToDelete);
      setDrafts(prev => prev.filter(d => d.id !== draftToDelete));
      if (currentDraftId === draftToDelete) {
        setCurrentDraftId(undefined);
      }
      showNotification('Draft deleted.', 'success');
    } catch (error) {
      console.error("Failed to delete draft:", error);
      showNotification('Failed to delete draft.', 'error');
    } finally {
      setIsDeleteDraftModalOpen(false);
      setDraftToDelete(null);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (user) {
      // Refresh history to include the new feedback
      const updatedHistory = await historyService.getUserHistory(user.uid);
      setHistory(updatedHistory);
      // Note: We intentionally do NOT set currentAnalysisHasFeedback(true) here
      // so that the "Thank You" message remains visible for the current session.
      // It will be hidden next time the user views this analysis from history.
    }
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
      showNotification('Analysis deleted successfully', 'success');
    } catch (error: any) {
      console.error("Failed to delete analysis:", error);
      showNotification(`Failed to delete analysis: ${error.message || 'Unknown error'}`, 'error');
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
      showNotification("Profile setup complete!", 'success');
    } catch (error) {
      console.error("Onboarding error:", error);
      showNotification("Failed to save profile.", 'error');
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      await authService.resendInitialVerificationEmail();
      showNotification('Verification email resent successfully!', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to resend email.', 'error');
    } finally {
      setIsResendingVerification(false);
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

      {/* Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title={user ? "Back to Dashboard" : "Back to Home"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center cursor-pointer group" onClick={handleReset}>
              <Logo darkMode={darkMode} size="md" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${
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
              <div className="flex items-center gap-1 sm:gap-3 pl-2 sm:border-l border-slate-200 dark:border-slate-700">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pro Member</span>
                  {user.lastVisited && (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Last Visited: {new Date(user.lastVisited).toLocaleDateString()}
                    </span>
                  )}
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
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
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
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {user && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-[70] px-4 py-3 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[80px] xs:max-w-[120px] truncate">{user.name}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Pro Member</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold ${
              displayCredits < 2 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              <Coins className="w-3.5 h-3.5" />
              <span>{displayCredits}</span>
              <button 
                onClick={() => setIsCreditPurchaseModalOpen(true)}
                className="ml-1 p-0.5 bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-full hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors"
                title="Buy Credits"
              >
                <Plus className="w-3 h-3" />
              </button>
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
            onSaveDraft={(updatedProfile) => handleSaveDraft(updatedProfile, jobContext || undefined)}
            onAutoSaveDraft={(updatedProfile) => handleSaveDraft(updatedProfile, jobContext || undefined, true)}
            isSavingDraft={isSavingDraft}
            isLoggedIn={!!user}
          />
        )}

        {currentStep === AppStep.JOB_SELECTION && (
          <StepJob 
            onAnalyze={handleJobAnalysis}
            onBack={() => setCurrentStep(AppStep.PROFILE_REVIEW)}
            credits={displayCredits}
            onBuyCredits={() => setIsCreditPurchaseModalOpen(true)}
            isGuest={!user}
            onSaveDraft={(context) => profile && handleSaveDraft(profile, context)}
            onAutoSaveDraft={(context) => profile && handleSaveDraft(profile, context, true)}
            isSavingDraft={isSavingDraft}
            initialContext={jobContext || undefined}
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
            candidateName={profile?.fullName || user?.name}
            experienceYears={profile?.experienceYears}
            jobRole={jobContext?.role}
            companyName={jobContext?.companyName}
            onReset={handleReset} 
            analysisId={currentAnalysisId}
            hasFeedback={currentAnalysisHasFeedback}
            onFeedbackSubmit={handleFeedbackSubmit}
            modelUsed={modelUsed || (jobContext?.modelSpeed === 'fastest' ? 'Gemini 3.1 Flash Lite' : jobContext?.modelSpeed === 'balanced' ? 'Gemini 3.5 Flash' : 'Gemini 3.1 Pro')}
            cost={analysisCost || (jobContext?.modelSpeed === 'fastest' ? 2 : jobContext?.modelSpeed === 'balanced' ? 3 : 5)}
          />
        )}

      </main>

      <ConfirmationModal
        isOpen={isSaveDraftModalOpen}
        onClose={() => {
          setIsSaveDraftModalOpen(false);
          setPendingSaveData(null);
        }}
        onConfirm={handleConfirmSaveDraft}
        title="Save Progress"
        message="Are you sure you want to save your progress as a draft? You can resume it later from your dashboard."
        confirmText="Save Draft"
        isDangerous={false}
      />

      <ConfirmationModal
        isOpen={isDeleteDraftModalOpen}
        onClose={() => {
          setIsDeleteDraftModalOpen(false);
          setDraftToDelete(null);
        }}
        onConfirm={handleConfirmDeleteDraft}
        title="Delete Draft"
        message="Are you sure you want to delete this draft? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Analysis"
        message="Are you sure you want to delete this analysis from your history?"
        confirmText="Delete"
        isDangerous={true}
      />

    </div>
  );

  const handleNewAnalysis = () => {
    handleReset();
    navigate('/app');
  };

  return (
    <>
      {/* Global Banners and Popups */}
      {user && user.emailVerified === false && (
        <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-md flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-in slide-in-from-top-2 z-50 relative">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Please verify your email address to receive your 10 free credits. Check your inbox (and spam folder).</span>
          </div>
          <button 
            onClick={handleResendVerification}
            disabled={isResendingVerification}
            className="text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isResendingVerification ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
            ) : (
              'Resend Email'
            )}
          </button>
        </div>
      )}

      <Routes>
        <Route 
          path="/" 
          element={
          <>
            <LandingPage 
              onTryDemo={handleNewAnalysis} 
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
              drafts={drafts}
              onResumeDraft={handleResumeDraft}
              onDeleteDraft={handleDeleteDraft}
              viewMode="landing"
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
                <ConfirmationModal
                  isOpen={isDeleteDraftModalOpen}
                  onClose={() => setIsDeleteDraftModalOpen(false)}
                  onConfirm={handleConfirmDeleteDraft}
                  title="Delete Draft"
                  message="Are you sure you want to delete this draft? Your saved progress will be lost."
                  confirmText="Delete Draft"
                  isDangerous={true}
                />
              </>
            )}
          </>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          user ? (
          <>
            <LandingPage 
              onTryDemo={handleNewAnalysis} 
              onLoginClick={() => {}}
              onSignupClick={() => {}}
              onBuyCredits={() => setIsCreditPurchaseModalOpen(true)}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              user={user}
              onLogout={handleLogout}
              history={history}
              onViewHistory={handleViewHistory}
              onDeleteHistory={handleDeleteHistory}
              onSettingsClick={() => setIsProfileEditModalOpen(true)}
              drafts={drafts}
              onResumeDraft={handleResumeDraft}
              onDeleteDraft={handleDeleteDraft}
              viewMode="dashboard"
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
            <ConfirmationModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={handleConfirmDelete}
              title="Delete Analysis"
              message="Are you sure you want to delete this analysis? This action cannot be undone."
              confirmText="Delete"
              isDangerous={true}
            />
            <ConfirmationModal
              isOpen={isDeleteDraftModalOpen}
              onClose={() => setIsDeleteDraftModalOpen(false)}
              onConfirm={handleConfirmDeleteDraft}
              title="Delete Draft"
              message="Are you sure you want to delete this draft? Your saved progress will be lost."
              confirmText="Delete Draft"
              isDangerous={true}
            />
          </>
          ) : <Navigate to="/" replace />
        } 
      />
      <Route path="/shared/:id" element={<SharedResultPage darkMode={darkMode} />} />
      <Route path="/app/*" element={mainAppContent} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    
    {/* Floating Chatbot - Rendered globally */}
    {!isProfileEditModalOpen && !isCreditPurchaseModalOpen && !isAuthModalOpen && (
      <ChatWidget />
    )}

    {/* Hidden SVGs for PDF Generation globally available (visually hidden but mounted for canvas) */}
    <div className="fixed opacity-0 pointer-events-none -z-50" aria-hidden="true">
      <BrainCircuit id="pdf-icon-brain" stroke="#9333ea" strokeWidth={2} />
      <AlertTriangle id="pdf-icon-alert" stroke="#ef4444" strokeWidth={2} />
      <BookOpen id="pdf-icon-book" stroke="#3b82f6" strokeWidth={2} />
      <Briefcase id="pdf-icon-briefcase" stroke="#3b82f6" strokeWidth={2} />
    </div>
    </>
  );
};

export default App;
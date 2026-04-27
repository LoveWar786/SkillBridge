import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, CheckCircle, User, Zap, Shield, Sparkles } from 'lucide-react';
import { User as UserType } from '../services/authService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: Partial<UserType> & { experienceYears?: number }) => void;
  user: UserType;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  user
}) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.name || '');
  const [experienceYears, setExperienceYears] = useState<number>(0);

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete({ name, experienceYears });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const steps = [
    {
      title: "Welcome to SkillBridge!",
      description: "Let's get you set up to accelerate your career journey.",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            SkillBridge uses advanced AI to analyze your profile against job descriptions, identifying gaps and creating personalized learning paths.
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Secure</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-purple-700 dark:text-purple-300">Fast</p>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Accurate</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Tell us about yourself",
      description: "This helps our AI tailor the analysis to your experience level.",
      icon: <User className="w-12 h-12 text-purple-500" />,
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Approximate years of professional experience in your field.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "How Credits Work",
      description: "You have 10 free credits to start! Each analysis cost depends on the model you choose.",
      icon: <Zap className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
            <p className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4">
              Analysis Cost Depends on Model
            </p>
            <div className="space-y-2 text-left bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fastest (Flash Lite)</span>
                    <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">2 Credits</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Balanced (Flash 3.0)</span>
                    <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">3 Credits</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Deep Reasoning (Pro)</span>
                    <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-full">5 Credits</span>
                </div>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Choose the model that fits your needs. You can earn more credits by referring friends or purchasing packs.
          </p>
        </div>
      )
    },
    {
      title: "You're All Set!",
      description: "Ready to launch your career to the next level?",
      icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-6 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Click "Get Started" to enter your dashboard. You can upload your CV or enter your skills manually to begin your first analysis.
          </p>
          <div className="inline-block p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-pulse">
            <ArrowRight className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      )
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[70] overflow-hidden my-auto"
          >
            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="p-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                  {steps[step].icon}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {steps[step].title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {steps[step].description}
                </p>
              </div>

              {/* Content */}
              <div className="mb-8 min-h-[150px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {steps[step].content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleBack}
                  disabled={step === 0}
                  className={`px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  Back
                </button>
                
                <div className="flex gap-2">
                  {step < totalSteps - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onComplete({ name, experienceYears })}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      Get Started
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;

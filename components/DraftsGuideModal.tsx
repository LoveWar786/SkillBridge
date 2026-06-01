import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, CheckCircle, Save, Sparkles, Lock, Database } from 'lucide-react';

interface DraftsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DraftsGuideModal: React.FC<DraftsGuideModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const steps = [
    {
      title: "What is a Profile Draft?",
      description: "Save your progress and resume your analysis seamlessly at any time.",
      icon: <Save className="w-12 h-12 text-amber-500 animate-bounce" />,
      content: (
        <div className="space-y-4 text-center select-none">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Filling out a comprehensive career profile checklist can take some time. With <strong>Profile Drafts</strong>, you can capture your current answers at any step.
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-left">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-2">Key Benefit</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Never lose your typed fields, uploaded CV data, or targeted job details. Start now and finish when you are ready.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "How Saves Work",
      description: "Automatic tracking of your current wizard configuration.",
      icon: <Database className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4 text-center select-none">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            As you navigate through the multi-step form (Upload, Background, Job Target), we preserve your background state in real time.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">1. Fill checklist</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Input your professional experience and target keywords.</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">2. Instant save</span>
              <p className="text-[10px] text-slate-550 text-slate-500 dark:text-slate-400">Your draft is created and listed on your main dashboard.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Private & Secure Room Integration",
      description: "Rest easy knowing your session information is locked away.",
      icon: <Lock className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4 text-center select-none">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Your draft files and input texts are securely tied to your personal account room repository. No one else can view or edit your drafts.
          </p>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 inline-flex items-center gap-3 text-left">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-450 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Ready to Resume ANYTIME</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-normal">Just click the "Resume" button from the main landing dashboard to continue your alignment run.</p>
            </div>
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[70] overflow-hidden my-auto"
          >
            {/* Progress indicator */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full">
              <motion.div 
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                  {steps[step].icon}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {steps[step].title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {steps[step].description}
                </p>
              </div>

              {/* Content */}
              <div className="mb-8 min-h-[140px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    {steps[step].content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleBack}
                  disabled={step === 0}
                  className={`px-4 py-2 text-xs text-slate-505 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium ${step === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  Back
                </button>
                
                <div className="flex gap-2">
                  {step < totalSteps - 1 ? (
                    <button
                      onClick={handleNext}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                    >
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      Understood
                      <CheckCircle className="w-3.5 h-3.5" />
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

export default DraftsGuideModal;

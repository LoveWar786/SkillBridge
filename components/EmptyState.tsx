import React from 'react';
import { motion } from 'motion/react';
import { History, Save, Sparkles, ArrowRight, FileText, Plus, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  onAction: () => void;
  actionText?: string;
}

export const HistoryEmptyState: React.FC<EmptyStateProps> = ({ onAction, actionText = "Start Your First Analysis" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group select-none">
      {/* Decorative ambient blobs */}
      <div className="absolute -right-20 -bottom-20 w-56 h-56 bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-400/10 transition-colors duration-500" />
      <div className="absolute -left-20 -top-20 w-56 h-56 bg-purple-400/5 dark:bg-purple-600/5 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-400/10 transition-colors duration-500" />

      {/* Custom Vector/SVG Illustration */}
      <div className="relative mb-8 w-48 h-32 flex items-center justify-center">
        {/* Connection paths */}
        <svg className="absolute inset-0 w-full h-full text-slate-250 dark:text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 192 128">
          <motion.path
            d="M 30 64 C 60 30, 90 90, 162 64"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          />
          <motion.path
            d="M 30 64 C 70 100, 110 30, 162 64"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 16 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          />
        </svg>

        {/* Dashboard node (left) */}
        <motion.div
          className="absolute left-4 w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-lg text-slate-400 dark:text-slate-500"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </motion.div>

        {/* Core bridging hub (middle) */}
        <motion.div
          className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 border-2 border-dashed border-blue-500/45 dark:border-blue-400/40 flex items-center justify-center shadow-inner"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        >
          <Sparkles className="w-6 h-6 text-purple-500 dark:text-purple-400 animate-pulse" />
        </motion.div>

        {/* Destination target (right) */}
        <motion.div
          className="absolute right-4 w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg text-white"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
        >
          <History className="w-5 h-5" />
        </motion.div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Your Career Bridge is Empty</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 text-sm leading-relaxed">
        You haven&apos;t run any employability analyses yet. Start a profile alignment to map your exact skill gaps and build a customized mock learning path on the spot!
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAction}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 group/btn hover:cursor-pointer transition-all"
        id="empty-state-start-history-btn"
      >
        <span>{actionText}</span>
        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
      </motion.button>
    </div>
  );
};

export const DraftsEmptyState: React.FC<EmptyStateProps> = ({ onAction, actionText = "Create Profile Draft" }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group select-none">
      {/* Sparkle background details */}
      <div className="absolute right-4 top-4 opacity-10">
        <Sparkles className="w-16 h-16 text-blue-500" />
      </div>

      <div className="flex items-center gap-4 text-left flex-1">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
          <Save className="w-7 h-7" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 dark:text-white text-md tracking-tight">No draft configurations saved</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 leading-relaxed">
            You can save your profile draft or job context settings at <strong>any step</strong> of the wizard checklist, letting you resume your session instantly.
          </p>
        </div>
      </div>

      <button
        onClick={onAction}
        className="mt-4 sm:mt-0 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-semibold text-slate-500 transition-colors flex items-center justify-center gap-1.5 flex-shrink-0"
        id="empty-state-create-draft-btn"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{actionText}</span>
        <span title="Drafts are saved to your private room profile database instantly">
          <HelpCircle 
            className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 transition-colors cursor-help" 
          />
        </span>
      </button>
    </div>
  );
};

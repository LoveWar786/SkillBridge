import React, { useState } from 'react';
import { Star, MessageSquare, Send, X, ThumbsUp } from 'lucide-react';
import { historyService } from '../services/historyService';
import { auth } from '../firebase';

interface FeedbackWidgetProps {
  analysisId?: string;
  onClose?: () => void;
  onFeedbackSubmit?: () => void;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ analysisId, onClose, onFeedbackSubmit }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      setError("Please log in to submit feedback.");
      return;
    }

    if (!analysisId) {
      setError("Analysis ID is missing. Cannot save feedback.");
      return;
    }

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await historyService.addFeedback(analysisId, {
        rating,
        comment,
        timestamp: Date.now()
      });
      setIsSubmitted(true);
      if (onFeedbackSubmit) {
        onFeedbackSubmit();
      }
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Feedback error:", err);
      setError(err.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-green-100 dark:border-green-900/30 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600 dark:text-green-400">
          <ThumbsUp className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Thank You!</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Your feedback helps us improve the analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rate this Analysis</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">How helpful was this report?</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => { setRating(star); setError(null); }}
            className={`transition-all duration-200 hover:scale-110 focus:outline-none ${
              rating >= star 
                ? 'text-amber-400 fill-amber-400' 
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-200'
            }`}
          >
            <Star className="w-8 h-8" />
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any specific feedback? (Optional)"
            className="w-full p-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
          />
          <MessageSquare className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
        </div>

        {error && (
          <p className="text-red-500 text-xs font-medium">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Submit Feedback</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FeedbackWidget;

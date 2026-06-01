import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, MessageSquare, Briefcase, Building2, User, Star } from 'lucide-react';
import { testimonialService } from '../services/testimonialService';

interface SubmitTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  user?: any;
  onSuccess?: () => void;
}

const SubmitTestimonialModal: React.FC<SubmitTestimonialModalProps> = ({ 
  isOpen, 
  onClose,
  darkMode,
  user,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    content: '',
    rating: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.role || !formData.content) {
        throw new Error('Please fill in all required fields.');
      }
      
      await testimonialService.submitTestimonial({
        userId: user?.uid,
        name: formData.name,
        role: formData.role,
        company: formData.company,
        content: formData.content,
        rating: formData.rating
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ name: '', role: '', company: '', content: '', rating: 5 });
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit testimonial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm ${darkMode ? 'dark' : ''}`}
            onClick={onClose}
          />
          
          <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none ${darkMode ? 'dark' : ''}`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-800"
            >
              {isSuccess ? (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Thank You!</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Your testimonial has been submitted successfully. It will appear on our page once verified by our team.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                      Share Your Experience
                    </h3>
                    <button 
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                          {error}
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-400" /> Full Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                            placeholder="John Doe"
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                              <Briefcase className="w-4 h-4 text-slate-400" /> Current Role
                            </label>
                            <input
                              type="text"
                              value={formData.role}
                              onChange={(e) => setFormData({...formData, role: e.target.value})}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                              placeholder="Software Engineer"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-400" /> Company (Optional)
                            </label>
                            <input
                              type="text"
                              value={formData.company}
                              onChange={(e) => setFormData({...formData, company: e.target.value})}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                              placeholder="Google"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-slate-400" /> Rating
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setFormData({...formData, rating: star})}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  formData.rating >= star 
                                    ? 'text-amber-400 hover:text-amber-500' 
                                    : 'text-slate-300 dark:text-slate-700 hover:text-amber-400'
                                }`}
                              >
                                <Star className="w-6 h-6 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-slate-400" /> Testimonial
                          </label>
                          <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors resize-none h-32"
                            placeholder="Share how SkillBridge helped your career transition..."
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Testimonial'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SubmitTestimonialModal;

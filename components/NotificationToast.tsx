import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, AlertCircle } from 'lucide-react';

interface NotificationToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500 border-emerald-400 text-white';
      case 'error':
        return 'bg-red-500 border-red-400 text-white';
      case 'info':
        return 'bg-blue-500 border-blue-400 text-white';
      default:
        return 'bg-emerald-500 border-emerald-400 text-white';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border ${getColors()}`}
    >
      {getIcon()}
      <div className="flex-1">
        <p className="font-bold text-sm leading-tight">{message}</p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default NotificationToast;

import React from 'react';
import { AlertCircle, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  solutions?: string[];
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = "Something went wrong",
  message,
  solutions,
  onRetry,
  onClose,
  className = "",
  variant = 'error'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-800 dark:text-amber-200',
          icon: 'text-amber-500 dark:text-amber-400',
          button: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-500 dark:text-blue-400',
          button: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100'
        };
      case 'error':
      default:
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-500 dark:text-red-400',
          button: 'bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-900 dark:text-red-100'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`rounded-xl border p-4 ${styles.bg} ${styles.border} ${className} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
          <AlertCircle className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${styles.text} mb-1`}>
            {title}
          </h3>
          
          <p className={`text-sm ${styles.text} opacity-90 mb-3`}>
            {message}
          </p>

          {solutions && solutions.length > 0 && (
            <div className="mb-3">
              <p className={`text-xs font-medium ${styles.text} opacity-75 mb-1.5 uppercase tracking-wider`}>
                Try the following:
              </p>
              <ul className="space-y-1">
                {solutions.map((solution, idx) => (
                  <li key={idx} className={`text-xs ${styles.text} flex items-start gap-1.5`}>
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
                    <span className="opacity-90">{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${styles.button}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${styles.text}`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;

import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import ErrorMessage from './ErrorMessage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  initialView?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialView = 'login' }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot-password' | 'google-signup-name'>(initialView);
  const [email, setEmail] = useState('');

  // Reset view when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialView]);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<{uid: string, email: string} | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (view === 'forgot-password') {
        await authService.resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
        setIsLoading(false);
        return;
      }

      if (view === 'google-signup-name') {
        if (!googleUser) throw new Error('Google user data missing');
        const user = await authService.completeGoogleSignup(googleUser.uid, googleUser.email, name, password);
        onLoginSuccess(user);
        onClose();
        return;
      }

      let user;
      if (view === 'login') {
        user = await authService.login(email, password);
      } else {
        user = await authService.register(email, password, name);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      if (view !== 'forgot-password') {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Login timed out. Please check your network or try again.')), 60000); // 60s timeout
    });

    try {
      // Race between login and timeout
      const result = await Promise.race([
        authService.loginWithGoogle(),
        timeoutPromise
      ]) as { user: any; isNewUser: boolean };
      
      if (result.isNewUser) {
        setGoogleUser({ uid: result.user.uid, email: result.user.email });
        setName(result.user.name || ''); // Pre-fill if available
        setView('google-signup-name');
        setIsLoading(false);
      } else {
        onLoginSuccess(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore multiple popup requests
        return;
      } else if (err.code === 'auth/popup-blocked') {
        setError('Login popup was blocked. Please allow popups for this site.');
      } else {
        setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'login': return 'Welcome Back';
      case 'register': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'google-signup-name': return 'Complete Signup';
    }
  };

  const getDescription = () => {
    switch (view) {
      case 'login': return 'Login to access your saved progress and credits.';
      case 'register': return 'Sign up to get 10 free analysis credits!';
      case 'forgot-password': return 'Enter your email to receive a password reset link.';
      case 'google-signup-name': return 'Please confirm your name to complete your account.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500 ease-out p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out my-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {view === 'forgot-password' && (
          <button 
            onClick={() => { setView('login'); setError(''); setSuccess(''); }}
            className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {getTitle()}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {getDescription()}
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage 
              title="Authentication Error"
              message={error}
              variant="error"
              onClose={() => setError('')}
            />
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-600 dark:text-green-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(view === 'register' || view === 'google-signup-name') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  placeholder="John Doe"
                  autoFocus={view === 'google-signup-name'}
                />
              </div>
            </div>
          )}

          {view !== 'google-signup-name' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          {view !== 'forgot-password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {view === 'google-signup-name' ? 'Create Password' : 'Password'}
                </label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setView('forgot-password'); setError(''); setSuccess(''); }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  placeholder="••••••••"
                />
              </div>
              {view === 'google-signup-name' && (
                <p className="text-xs text-slate-500 mt-1">Set a password to log in without Google later.</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              view === 'login' ? 'Sign In' : (view === 'register' ? 'Create Account' : (view === 'google-signup-name' ? 'Complete Signup' : 'Send Reset Link'))
            )}
          </button>
        </form>

        {view !== 'forgot-password' && view !== 'google-signup-name' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {view === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                {view === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

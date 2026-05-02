import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, Save, Receipt, Calendar, CreditCard, Shield, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { authService, User as UserType } from '../services/authService';
import ErrorMessage from './ErrorMessage';
import { useNavigate } from 'react-router-dom';

type TabType = 'account' | 'security' | 'purchases' | 'danger';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateSuccess: (user: UserType, originalEmail?: string) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, currentUser, onUpdateSuccess }) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [isCancellingEmail, setIsCancellingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      setSuccess('');
      setResendSuccess('');
      setActiveTab('account');
      setDeleteConfirmation('');
    }
  }, [isOpen]); // Only reset on open

  // Update local state if currentUser updates in background (e.g. email verification)
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setSuccess((prev) => {
        if (!currentUser.pendingEmail && prev.includes('verify your new email')) {
          return 'Email successfully changed!';
        }
        return prev;
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleResendVerification = async () => {
    if (!currentUser.pendingEmail) return;
    setIsResending(true);
    setError('');
    setResendSuccess('');
    try {
      await authService.resendEmailChangeVerification(currentUser.pendingEmail, currentPassword);
      setResendSuccess('Verification email resent successfully!');
      setTimeout(() => setResendSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleCancelEmailChange = async () => {
    if (!currentUser.pendingEmail) return;
    setIsCancellingEmail(true);
    setError('');
    try {
      await authService.cancelEmailChange(currentUser.uid);
      setSuccess('Email change request cancelled.');
      // Update local user state via parent callback
      const updatedUser = { ...currentUser, pendingEmail: null };
      onUpdateSuccess(updatedUser as UserType);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel email change');
    } finally {
      setIsCancellingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion.');
      return;
    }
    
    if (!currentPassword) {
      setError('Please enter your password to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await authService.deleteAccount(currentUser.uid, currentPassword);
      // Redirect to home or login after deletion
      onClose();
      navigate('/');
      window.location.reload(); // Force reload to clear any auth state
    } catch (err: any) {
      setError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword && newPassword !== confirmNewPassword) {
      setError("New passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      const updatedUser = await authService.updateProfile(
        currentUser.uid,
        currentPassword,
        name,
        email,
        newPassword || undefined
      ) as UserType & { _nameChanged?: boolean, _oldName?: string };

      if (newPassword) {
        setSuccess('Password changed successfully!');
      } else if (updatedUser.pendingEmail) {
        setSuccess('Profile updated. Please check your inbox to verify your new email address.');
      } else {
        setSuccess('Profile updated successfully!');
      }
      
      onUpdateSuccess(updatedUser, updatedUser._nameChanged ? updatedUser._oldName : undefined);
      
      // Modal stays open now as requested
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500 ease-out p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out flex flex-col md:flex-row overflow-hidden h-[85vh] md:h-[650px]">
        
        {/* Global Close Button (Mobile & Desktop) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors z-50 p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-full backdrop-blur-sm shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col pt-2 md:pt-0">
          <div className="p-6 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'account' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <User className="w-5 h-5" />
              Account Info
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'security' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-5 h-5" />
              Password & Security
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'purchases' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-5 h-5" />
              Purchase History
            </button>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('danger')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === 'danger' 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </button>
            </div>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar pt-14 md:pt-8">
            {error && (
              <div className="mb-6">
                <ErrorMessage 
                  title="Profile Update Error"
                  message={error}
                  variant="error"
                  onClose={() => setError('')}
                />
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-600 dark:text-green-400 text-sm">
                <Save className="w-5 h-5 flex-shrink-0" />
                {success}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Account Information</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your personal details and email address.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                    {currentUser.pendingEmail && (
                      <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 w-full">
                          <p className="font-medium text-base">Verification Pending</p>
                          <p className="mt-1">
                            An email change to <span className="font-bold">{currentUser.pendingEmail}</span> is pending. 
                            Please check your inbox and verify the new email address to complete the update.
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleResendVerification}
                              disabled={isResending}
                              className="text-xs font-medium text-yellow-800 dark:text-yellow-200 bg-yellow-200 dark:bg-yellow-800/50 hover:bg-yellow-300 dark:hover:bg-yellow-700/50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isResending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Resending...
                                </>
                              ) : (
                                'Resend Verification Email'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEmailChange}
                              disabled={isCancellingEmail}
                              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-2 transition-colors disabled:opacity-50"
                            >
                              {isCancellingEmail ? 'Cancelling...' : 'Cancel Change'}
                            </button>
                            {resendSuccess && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{resendSuccess}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password (Required to save changes)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Enter current password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !currentPassword}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      'Save Account Info'
                    )}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Password & Security</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your password to keep your account secure.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Enter current password"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        required={!!confirmNewPassword}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>

                  {newPassword && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !currentPassword || !newPassword || !confirmNewPassword}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'purchases' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Purchase History</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View your past credit purchases and transactions.</p>
                </div>

                {(!currentUser.purchaseHistory || currentUser.purchaseHistory.length === 0) ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <Receipt className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-medium text-slate-900 dark:text-white">No purchases yet</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">When you buy credits to use premium features, your transaction history will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...currentUser.purchaseHistory].reverse().map((record) => (
                      <div key={record.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-lg text-slate-900 dark:text-white">{record.credits} Credits</span>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(record.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span>{new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end bg-slate-50 dark:bg-slate-900/50 sm:bg-transparent sm:dark:bg-transparent p-3 rounded-xl sm:p-0 sm:rounded-none">
                          <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">${record.price.toFixed(2)}</span>
                          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                            <CreditCard className="w-4 h-4" />
                            <span>{record.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'danger' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-red-600 dark:text-red-500">Danger Zone</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Irreversible actions for your account.</p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-red-700 dark:text-red-400">Delete Account</h4>
                      <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-2 leading-relaxed">
                        This action is permanent and cannot be undone. It will delete your:
                      </p>
                      <ul className="list-disc list-inside text-sm text-red-600/80 dark:text-red-300/80 mt-2 space-y-1 ml-1">
                        <li>User profile and settings</li>
                        <li>All analysis history and reports</li>
                        <li>Purchase history and credits</li>
                        <li>Feedback and saved data</li>
                      </ul>
                      
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                            Enter your password to confirm
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-red-300" />
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full pl-10 p-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-red-900 dark:text-red-100 placeholder:text-red-300"
                              placeholder="Your password"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                            Type <span className="font-mono font-bold">DELETE</span> to confirm
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-red-900 dark:text-red-100 placeholder:text-red-300"
                            placeholder="DELETE"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'DELETE' || !currentPassword || isDeleting}
                        className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200 dark:shadow-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Deleting Account...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-5 h-5" />
                            Delete My Account Permanently
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;

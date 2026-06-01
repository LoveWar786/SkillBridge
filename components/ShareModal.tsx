import React, { useState, useEffect } from 'react';
import { X, Copy, Link as LinkIcon, Clock, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { AnalysisResult } from '../types';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string;
  analysisData: AnalysisResult;
  jobRole?: string;
  companyName?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, analysisId, analysisData, jobRole, companyName }) => {
  const [activeLink, setActiveLink] = useState<{ id: string, expiresAt: number | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<string>('permanent');
  const [copied, setCopied] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      fetchActiveLink();
    }
  }, [isOpen]);

  const fetchActiveLink = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'shared_links'), where('analysisId', '==', analysisId), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      
      let foundLink = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.expiresAt === null || data.expiresAt > Date.now()) {
          foundLink = { id: doc.id, expiresAt: data.expiresAt };
        } else {
          // Clean up expired links
          deleteDoc(doc.ref).catch(console.error);
        }
      });
      
      setActiveLink(foundLink);
    } catch (error) {
      console.error("Error fetching shared link:", error);
      handleFirestoreError(error, OperationType.GET, 'shared_links');
    } finally {
      setIsLoading(false);
    }
  };

  const generateLink = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      let expiresAt: number | null = null;
      const now = Date.now();
      
      switch (duration) {
        case '1h': expiresAt = now + 60 * 60 * 1000; break;
        case '8h': expiresAt = now + 8 * 60 * 60 * 1000; break;
        case '1d': expiresAt = now + 24 * 60 * 60 * 1000; break;
        case '1w': expiresAt = now + 7 * 24 * 60 * 60 * 1000; break;
        case 'permanent': expiresAt = null; break;
      }

      const docRef = await addDoc(collection(db, 'shared_links'), {
        userId: auth.currentUser.uid,
        analysisId,
        analysisData,
        jobRole: jobRole || null,
        companyName: companyName || null,
        createdAt: now,
        expiresAt
      });

      setActiveLink({ id: docRef.id, expiresAt });
      showNotification('Public link generated successfully.', 'success');
    } catch (error) {
      console.error("Error generating link:", error);
      handleFirestoreError(error, OperationType.CREATE, 'shared_links');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLink = async () => {
    if (!activeLink) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'shared_links', activeLink.id));
      setActiveLink(null);
      setCopied(false);
      showNotification('Shared link expired successfully.', 'success');
    } catch (error) {
      console.error("Error deleting link:", error);
      handleFirestoreError(error, OperationType.DELETE, `shared_links/${activeLink.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!activeLink) return;
    const url = `${window.location.origin}/shared/${activeLink.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showNotification('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-purple-500" />
            Share Result
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Generate a public link to share your analysis result. Anyone with the link can view it without logging in.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : activeLink ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Your Public Link
                  </span>
                  {activeLink.expiresAt && (
                    <span className="text-xs flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      Expires: {new Date(activeLink.expiresAt).toLocaleString()}
                    </span>
                  )}
                  {!activeLink.expiresAt && (
                    <span className="text-xs flex items-center gap-1 text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
                      Permanent Link
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/shared/${activeLink.id}`}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 text-purple-700 dark:text-purple-400 p-2 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                {copied && <p className="text-xs text-green-500 mt-2 text-right">Copied to clipboard!</p>}
              </div>
              
              <button 
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Expire Link & Generate New
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Link Expiration
                </label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="1h">1 Hour</option>
                  <option value="8h">8 Hours</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                  <option value="permanent">Permanent (1-time URL)</option>
                </select>
              </div>
              
              <button 
                onClick={generateLink}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-5 h-5" />
                Generate Link
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deleteLink}
        title="Expire Shared Link?"
        message="This will immediately deactivate the current public link. Anyone with the link will no longer be able to view your report. Are you sure?"
        confirmText="Expire Link"
        isDangerous={true}
      />
    </div>
  );
};

export default ShareModal;

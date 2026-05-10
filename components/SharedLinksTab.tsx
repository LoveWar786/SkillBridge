import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Loader2, Link as LinkIcon, Trash2, ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ErrorMessage from './ErrorMessage';
import { handleFirestoreError, OperationType } from '../services/firestoreUtils';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';

interface SharedLink {
  id: string;
  analysisId: string;
  jobRole: string | null;
  companyName: string | null;
  createdAt: number;
  expiresAt: number | null;
}

export const SharedLinksTab: React.FC = () => {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const { showNotification } = useNotification();

  const fetchLinks = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'shared_links'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const fetchedLinks: SharedLink[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedLinks.push({
          id: doc.id,
          analysisId: data.analysisId,
          jobRole: data.jobRole,
          companyName: data.companyName,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt
        });
      });
      // Sort by newest first
      fetchedLinks.sort((a, b) => b.createdAt - a.createdAt);
      setLinks(fetchedLinks);
    } catch (err: any) {
      console.error("Error fetching shared links:", err);
      setError("Failed to load shared links.");
      handleFirestoreError(err, OperationType.GET, 'shared_links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleDelete = async (id: string) => {
    setLinkToDelete(id);
  };

  const confirmDelete = async () => {
    if (!linkToDelete) return;
    
    const id = linkToDelete;
    setDeletingId(id);
    setLinkToDelete(null);
    try {
      await deleteDoc(doc(db, 'shared_links', id));
      setLinks(prev => prev.filter(link => link.id !== id));
      showNotification('Shared link expired successfully', 'success');
    } catch (err: any) {
      console.error("Error deleting shared link:", err);
      setError("Failed to delete the shared link.");
      showNotification('Failed to expire shared link', 'error');
      handleFirestoreError(err, OperationType.DELETE, `shared_links/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (expiresAt: number | null) => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading shared links...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Shared Links</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the analysis reports you've shared with others.</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage 
            title="Error"
            message={error}
            variant="error"
            onClose={() => setError('')}
          />
        </div>
      )}

      {links.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Shared Links Yet</h4>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You haven't shared any analysis reports yet. When you share a report, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map(link => {
            const expired = isExpired(link.expiresAt);
            return (
              <div key={link.id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all ${expired ? 'border-red-200 dark:border-red-900/50 opacity-75' : 'border-slate-200 dark:border-slate-800 hover:shadow-md'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                        {link.jobRole || 'General Analysis'}
                      </h4>
                      {expired && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Expired
                        </span>
                      )}
                      {!expired && link.expiresAt && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(link.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {!expired && !link.expiresAt && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                          Permanent
                        </span>
                      )}
                    </div>
                    {link.companyName && (
                      <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">{link.companyName}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Created: {new Date(link.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:flex-col md:flex-row">
                    <Link
                      to={`/shared/${link.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {deletingId === link.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Expire
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!linkToDelete}
        onClose={() => setLinkToDelete(null)}
        onConfirm={confirmDelete}
        title="Expire Shared Link"
        message="Are you sure you want to expire and delete this shared link? Anyone with the link will no longer be able to access it."
        confirmText="Expire Link"
        isDangerous={true}
      />
    </div>
  );
};

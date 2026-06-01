import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, limit, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { AnalysisResult, AnalysisHistoryItem, UserFeedback } from '../types';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import { statsService } from './statsService';

export const historyService = {
  saveAnalysis: async (_userId: string, result: AnalysisResult, jobRole: string, companyName?: string, candidateName?: string, experienceYears?: number, modelUsed?: string, cost?: number): Promise<string> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to save analysis");
      }

      // Use currentUser.uid to ensure consistency with security rules
      const docRef = await addDoc(collection(db, 'analyses'), {
        userId: currentUser.uid,
        timestamp: Date.now(),
        jobRole,
        companyName: companyName || null,
        candidateName: candidateName || null,
        experienceYears: experienceYears || null,
        result,
        modelUsed: modelUsed || null,
        cost: cost || 0
      });

      // Increment global stats
      statsService.incrementAnalyses().catch(console.error);

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'analyses');
      throw error; // unreachable but for TS
    }
  },

  addFeedback: async (analysisId: string, feedback: UserFeedback): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to add feedback");
      }
      
      const analysisRef = doc(db, 'analyses', analysisId);
      
      // Verify ownership first to prevent permission errors
      const analysisDoc = await getDoc(analysisRef);
      if (!analysisDoc.exists()) {
        throw new Error("Analysis not found");
      }
      
      const data = analysisDoc.data();
      if (data.userId !== currentUser.uid) {
        throw new Error("You do not have permission to add feedback to this analysis");
      }

      await updateDoc(analysisRef, {
        feedback: feedback
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `analyses/${analysisId}`);
      throw error;
    }
  },

  getUserHistory: async (_userId: string): Promise<AnalysisHistoryItem[]> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("getUserHistory called but user is not logged in");
        return [];
      }

      // Ensure we only query for the current user's data
      const targetUserId = currentUser.uid;
      console.log(`Fetching history for user: ${targetUserId}`);
      
      const q = query(
        collection(db, 'analyses'),
        where('userId', '==', targetUserId),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const history: AnalysisHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          userId: data.userId,
          timestamp: data.timestamp,
          jobRole: data.jobRole,
          companyName: data.companyName,
          candidateName: data.candidateName,
          experienceYears: data.experienceYears,
          result: data.result as AnalysisResult,
          feedback: data.feedback,
          modelUsed: data.modelUsed,
          cost: data.cost
        });
      });
      
      // Sort by timestamp desc in memory
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'analyses');
      return [];
    }
  },

  deleteAnalysis: async (analysisId: string): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to delete analysis");
      }
      
      const docRef = doc(db, 'analyses', analysisId);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await deleteDoc(docRef);
        }
      } catch (e: any) {
        // If getDoc fails due to outdated rules, try deleteDoc directly, or gracefully fail
        if (e?.message?.includes('Missing or insufficient permissions')) {
            console.warn('Cannot verify analysis ownership due to rules, attempting direct delete...');
            await deleteDoc(docRef);
        } else {
            throw e;
        }
      }
    } catch (error: any) {
      // If it STILL fails with permissions, but we were just deleting,
      // it might be because the rules don't allow delete yet or document doesn't exist
      if (error?.message?.includes('Missing or insufficient permissions')) {
        console.warn('Failed to delete analysis on the server. Your Firestore rules might be outdated.');
      } else {
        handleFirestoreError(error, OperationType.DELETE, `analyses/${analysisId}`);
      }
    }
  },

  logCreditUsage: async (userId: string, amount: number, action: string, modelUsed?: string): Promise<void> => {
    try {
      await addDoc(collection(db, 'credit_usage'), {
        userId,
        timestamp: Date.now(),
        amount,
        action,
        modelUsed
      });
    } catch (error) {
      console.error("Error logging credit usage:", error);
      // Don't throw, as this is non-critical
    }
  },

  getCreditUsage: async (userId: string): Promise<any[]> => {
    try {
      const q = query(
        collection(db, 'credit_usage'),
        where('userId', '==', userId),
        limit(100) // Limit to last 100 records
      );
      
      const querySnapshot = await getDocs(q);
      const usage: any[] = [];
      
      querySnapshot.forEach((doc) => {
        usage.push({ id: doc.id, ...doc.data() });
      });
      
      return usage.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Error fetching credit usage:", error);
      return [];
    }
  }
};

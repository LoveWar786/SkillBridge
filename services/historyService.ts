import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, limit, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { AnalysisResult, AnalysisHistoryItem, UserFeedback } from '../types';

export const historyService = {
  saveAnalysis: async (userId: string, result: AnalysisResult, jobRole: string, companyName?: string, candidateName?: string, experienceYears?: number, modelUsed?: string, cost?: number): Promise<string> => {
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
      return docRef.id;
    } catch (error) {
      console.error("Error saving analysis:", error);
      throw error;
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
      console.error("Error adding feedback:", error);
      throw error;
    }
  },

  getUserHistory: async (userId: string): Promise<AnalysisHistoryItem[]> => {
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
      console.error("Error fetching history:", error);
      return [];
    }
  },

  deleteAnalysis: async (analysisId: string): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to delete analysis");
      }
      
      await deleteDoc(doc(db, 'analyses', analysisId));
    } catch (error) {
      console.error("Error deleting analysis:", error);
      throw error;
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

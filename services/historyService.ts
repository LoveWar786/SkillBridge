import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, limit, deleteDoc, doc } from 'firebase/firestore';
import { AnalysisResult, AnalysisHistoryItem } from '../types';

export const historyService = {
  saveAnalysis: async (userId: string, result: AnalysisResult, jobRole: string, companyName?: string): Promise<string> => {
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
        result
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving analysis:", error);
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
          result: data.result as AnalysisResult
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
  }
};

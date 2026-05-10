import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';

export interface GlobalStats {
  totalAnalyses: number;
  totalUsers: number;
  cvsParsedToday: number;
  activeUsers: number;
}

const STATS_DOC_ID = 'global';
const statsRef = doc(db, 'stats', STATS_DOC_ID);

export const statsService = {
  incrementAnalyses: async () => {
    try {
      await updateDoc(statsRef, {
        totalAnalyses: increment(1),
        cvsParsedToday: increment(1)
      });
    } catch (error) {
      // If doc doesn't exist, create it
      await setDoc(statsRef, {
        totalAnalyses: 1,
        totalUsers: 1,
        cvsParsedToday: 1,
        activeUsers: 1
      }, { merge: true });
    }
  },

  incrementUsers: async () => {
    try {
      await updateDoc(statsRef, {
        totalUsers: increment(1)
      });
    } catch (error) {
      await setDoc(statsRef, {
        totalAnalyses: 0,
        totalUsers: 1,
        cvsParsedToday: 0,
        activeUsers: 1
      }, { merge: true });
    }
  },

  getStats: async (): Promise<GlobalStats> => {
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      return snap.data() as GlobalStats;
    }
    return {
      totalAnalyses: 0,
      totalUsers: 0,
      cvsParsedToday: 0,
      activeUsers: 0
    };
  },

  subscribeToStats: (callback: (stats: GlobalStats) => void) => {
    return onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as GlobalStats);
      }
    });
  }
};

import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { Draft, UserProfile, JobContext, AppStep } from '../types';
import { handleFirestoreError, OperationType } from './firestoreUtils';

const COLLECTION_NAME = 'drafts';

export const draftService = {
  async saveDraft(
    userId: string,
    profile: UserProfile,
    step: AppStep,
    jobContext?: JobContext,
    draftId?: string
  ): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User must be logged in to save draft");
    }

    const draftData = {
      userId: currentUser.uid,
      profile,
      jobContext: jobContext || null,
      step,
      timestamp: Date.now(),
    };

    try {
      if (draftId) {
        const draftRef = doc(db, COLLECTION_NAME, draftId);
        await updateDoc(draftRef, draftData);
        return draftId;
      } else {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), draftData);
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, draftId ? OperationType.UPDATE : OperationType.CREATE, COLLECTION_NAME);
      return '';
    }
  },

  async getUserDrafts(userId: string): Promise<Draft[]> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("getUserDrafts called but user is not logged in");
        return [];
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const drafts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Draft));

      // Sort by timestamp desc in memory to avoid index requirement
      return drafts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async deleteDraft(draftId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, draftId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    }
  }
};

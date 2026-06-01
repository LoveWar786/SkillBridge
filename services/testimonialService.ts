import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface Testimonial {
  id?: string;
  userId?: string;
  name: string;
  role: string;
  company?: string;
  content: string;
  rating?: number;
  isVerified: boolean;
  timestamp: number;
}

export const testimonialService = {
  async getVerifiedTestimonials(): Promise<Testimonial[]> {
    try {
      const q = query(
        collection(db, 'testimonials'),
        where('isVerified', '==', true),
        // Note: orderBy requires an index if used with where, so we fetch and sort on client for now to avoid needing index creation on user end immediately
        // orderBy('timestamp', 'desc') 
      );
      const snapshot = await getDocs(q);
      const testimonials = snapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp = Date.now();
        if (data.timestamp) {
            timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : data.timestamp;
        }
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name,
          role: data.role,
          company: data.company,
          content: data.content,
          rating: data.rating || 5,
          isVerified: data.isVerified,
          timestamp: timestamp,
        } as Testimonial;
      });
      // Client-side sort to avoid index requirements initially
      return testimonials.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Could not fetch testimonials (possibly missing Firestore security rules):', error);
      return [];
    }
  },

  async checkIfUserSubmitted(userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'testimonials'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.warn('Could not check user testimonial state (possibly missing Firestore security rules):', error);
      return false;
    }
  },

  async submitTestimonial(data: Omit<Testimonial, 'id' | 'isVerified' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, 'testimonials'), {
        ...data,
        isVerified: false,
        timestamp: Date.now() // using Date.now() for simplicity without serverTimestamp in typing
      });
    } catch (error: any) {
      console.warn('Could not submit testimonial:', error);
      if (error?.message?.includes('Missing or insufficient permissions')) {
        throw new Error('Permission denied. Please ensure your Firebase Firestore Security Rules are configured correctly for the "testimonials" collection.');
      }
      throw error;
    }
  }
};

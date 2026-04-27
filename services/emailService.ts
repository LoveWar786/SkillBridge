import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const emailService = {
  /**
   * Sends an email using the Firebase "Trigger Email" extension.
   * Requires the "Trigger Email" extension to be installed in the Firebase project
   * and configured to listen to the 'mail' collection.
   */
  sendEmail: async (to: string, subject: string, html: string) => {
    try {
      const currentUser = auth.currentUser;
      // Use doc() to generate a reference with an auto-generated ID first
      // This helps avoid potential race conditions with addDoc in some edge cases
      const mailRef = doc(collection(db, 'mail'));
      
      await setDoc(mailRef, {
        to: to, // Use string instead of array to ensure compatibility with all Trigger Email configs
        message: {
          subject: subject,
          html: html,
        },
        uid: currentUser ? currentUser.uid : null, // Add UID for security rules
        createdAt: serverTimestamp()
      });
      console.log('Email queued in Firestore "mail" collection with ID:', mailRef.id);
    } catch (error) {
      console.error('Error queuing email:', error);
      throw new Error('Failed to send email. Please try again.');
    }
  }
};

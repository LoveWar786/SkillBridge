import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as updateAuthProfile,
  updateEmail,
  updatePassword,
  User as FirebaseUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { emailService } from './emailService';

export interface PurchaseRecord {
  id: string;
  timestamp: number;
  credits: number;
  price: number;
  paymentMethod: string;
}

export interface User {
  email: string;
  name: string;
  credits: number;
  uid: string;
  pendingEmail?: string;
  emailVerified?: boolean;
  purchaseHistory?: PurchaseRecord[];
  onboardingCompleted?: boolean;
}

let tempPasswordForEmailChange: string | null = null;

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Check if pending email is verified
      let currentEmail = firebaseUser.email || '';
      let pendingEmail = userData.pendingEmail;

      if (pendingEmail && firebaseUser.email === pendingEmail) {
        // Verification complete, clear pendingEmail
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          pendingEmail: null,
          email: pendingEmail
        });
        pendingEmail = undefined;
      }

      return {
        uid: firebaseUser.uid,
        email: currentEmail,
        name: userData.name || firebaseUser.displayName || 'User',
        credits: userData.credits || 0,
        pendingEmail,
        emailVerified: firebaseUser.emailVerified,
        purchaseHistory: userData.purchaseHistory || [],
        onboardingCompleted: userData.onboardingCompleted || false
      };
    } else {
      // Create user doc if it doesn't exist (legacy/error case)
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        credits: 0,
        emailVerified: firebaseUser.emailVerified,
        purchaseHistory: [],
        onboardingCompleted: false
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: newUser.name,
        credits: newUser.credits,
        email: newUser.email,
        welcomeCreditsGranted: false,
        onboardingCompleted: false
      });
      return newUser;
    }
  },

  loginWithGoogle: async (): Promise<{ user: User; isNewUser: boolean }> => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.displayName || 'User',
          credits: userData.credits || 0,
          pendingEmail: userData.pendingEmail,
          emailVerified: true,
          purchaseHistory: userData.purchaseHistory || [],
          onboardingCompleted: userData.onboardingCompleted || false
        },
        isNewUser: false
      };
    } else {
      // New user via Google - Return info but don't create doc yet
      return {
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '', // Use Google name as suggestion
          credits: 10,
          emailVerified: true,
          purchaseHistory: [],
          onboardingCompleted: false
        },
        isNewUser: true
      };
    }
  },

  completeGoogleSignup: async (uid: string, email: string, name: string, password?: string): Promise<User> => {
    // Update Firebase Auth profile name
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await updateAuthProfile(currentUser, { displayName: name });
      
      if (password) {
        await updatePassword(currentUser, password);
      }
    }

    const newUser: User = {
      uid,
      email,
      name,
      credits: 10, // Default free credits
      emailVerified: true,
      purchaseHistory: [],
      onboardingCompleted: false
    };

    await setDoc(doc(db, 'users', uid), {
      name: newUser.name,
      email: newUser.email,
      credits: 10,
      welcomeCreditsGranted: true,
      onboardingCompleted: false
    });

    return newUser;
  },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  register: async (email: string, password: string, name: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await updateAuthProfile(firebaseUser, { displayName: name });
    
    // Send email verification
    await sendEmailVerification(firebaseUser);

    const newUser: User = {
      uid: firebaseUser.uid,
      email: email,
      name: name,
      credits: 0, // Start with 0 credits until verified
      emailVerified: false,
      purchaseHistory: [],
      onboardingCompleted: false
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name: name,
      email: email,
      credits: 0,
      welcomeCreditsGranted: false,
      onboardingCompleted: false
    });

    return newUser;
  },

  logout: async () => {
    await signOut(auth);
  },

  getUserData: async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid,
        email: data.email,
        name: data.name,
        credits: data.credits,
        pendingEmail: data.pendingEmail,
        emailVerified: auth.currentUser?.emailVerified,
        purchaseHistory: data.purchaseHistory || [],
        onboardingCompleted: data.onboardingCompleted || false
      };
    }
    return null;
  },

  completeOnboarding: async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      const currentUser = auth.currentUser;
      await setDoc(userRef, {
        name: currentUser?.displayName || 'User',
        email: currentUser?.email || '',
        credits: 10,
        welcomeCreditsGranted: true,
        onboardingCompleted: true
      });
    } else {
      await updateDoc(userRef, { onboardingCompleted: true });
    }
  },

  updateOnboardingData: async (uid: string, name: string) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        await updateAuthProfile(currentUser, { displayName: name });
    }
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: name,
        email: currentUser?.email || '',
        credits: 10,
        welcomeCreditsGranted: true,
        onboardingCompleted: true
      });
    } else {
      await updateDoc(userRef, { name, onboardingCompleted: true });
    }
  },

  updateUserCredits: async (uid: string, newCredits: number) => {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      const currentUser = auth.currentUser;
      await setDoc(userRef, {
        name: currentUser?.displayName || 'User',
        email: currentUser?.email || '',
        credits: newCredits,
        welcomeCreditsGranted: true,
        onboardingCompleted: false
      });
    } else {
      await updateDoc(userRef, { credits: newCredits });
    }
  },

  purchaseCredits: async (uid: string, currentCredits: number, creditsToAdd: number, price: number, paymentMethod: string): Promise<PurchaseRecord> => {
    const userRef = doc(db, 'users', uid);
    const newTotal = (currentCredits || 0) + creditsToAdd;
    
    const record: PurchaseRecord = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      credits: creditsToAdd,
      price: price,
      paymentMethod: paymentMethod
    };

    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      const currentUser = auth.currentUser;
      await setDoc(userRef, {
        name: currentUser?.displayName || 'User',
        email: currentUser?.email || '',
        credits: newTotal,
        welcomeCreditsGranted: true,
        onboardingCompleted: false,
        purchaseHistory: [record]
      });
    } else {
      await updateDoc(userRef, { 
        credits: newTotal,
        purchaseHistory: arrayUnion(record)
      });
    }

    return record;
  },

  updateProfile: async (uid: string, currentPassword: string, newName: string, newEmail: string, newPassword?: string): Promise<User> => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');
    if (!currentUser.email) throw new Error('User email not found');

    // Check if new email is already in use by another user
    if (newEmail !== currentUser.email) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('Email already in use by another account');
      }
    }

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    try {
      await reauthenticateWithCredential(currentUser, credential);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect current password');
      }
      throw error;
    }

    let nameChanged = false;
    let oldName = currentUser.displayName || '';

    if (newName !== currentUser.displayName) {
      await updateAuthProfile(currentUser, { displayName: newName });
      nameChanged = true;
      
      // Send email notification for name change
      try {
        await emailService.sendEmail(
          currentUser.email,
          'Profile Name Updated',
          `<p>Hello ${newName},</p><p>Your profile name has been successfully changed from <strong>${oldName}</strong> to <strong>${newName}</strong>.</p><p>If you did not make this change, please contact support immediately.</p>`
        );
      } catch (e) {
        console.error("Failed to send name change email:", e);
      }
    }

    let emailUpdatePending = false;

    if (newEmail !== currentUser.email) {
      try {
        tempPasswordForEmailChange = currentPassword;
        // Firebase strictly requires verification before changing email in newer projects
        await verifyBeforeUpdateEmail(currentUser, newEmail);
        emailUpdatePending = true;
        
        // Send initial notification that change was initiated
        try {
          await emailService.sendEmail(
            currentUser.email!,
            'Email Change Initiated',
            `<p>Hello ${newName},</p><p>A request to change your account email to <strong>${newEmail}</strong> has been initiated.</p><p>Please check your new inbox and click the verification link to complete this change.</p>`
          );
        } catch (e) {
          console.error("Failed to send initiation email:", e);
        }
      } catch (error: any) {
        console.error("Failed to update email:", error);
        throw new Error(error.message || 'Failed to update email.');
      }
    }

    if (newPassword) {
      await updatePassword(currentUser, newPassword);
    }

    // Update Firestore
    const userRef = doc(db, 'users', uid);
    const updateData: any = {
      name: newName
    };

    if (emailUpdatePending) {
      updateData.pendingEmail = newEmail;
    }

    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        ...updateData,
        email: currentUser.email || '',
        credits: 10,
        welcomeCreditsGranted: true,
        onboardingCompleted: true
      });
    } else {
      await updateDoc(userRef, updateData);
    }

    // Return updated user object
    const updatedUserDoc = await getDoc(userRef);
    const data = updatedUserDoc.data();

    return {
      uid,
      email: currentUser.email!,
      name: newName,
      credits: data?.credits || 0,
      pendingEmail: emailUpdatePending ? newEmail : undefined,
      emailVerified: currentUser.emailVerified,
      _nameChanged: nameChanged,
      _oldName: oldName
    } as User & { _nameChanged?: boolean, _oldName?: string };
  },

  checkEmailVerification: async (uid: string): Promise<User | null> => {
    let currentUser = auth.currentUser;
    
    // Fetch current Firestore data to get the pending email
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    
    const userData = userDoc.data();
    const pendingEmail = userData.pendingEmail;
    const oldEmail = userData.email;

    if (!pendingEmail) return null;

    // If user was signed out due to token revocation, try to sign back in
    if (!currentUser && tempPasswordForEmailChange) {
      try {
        // First try with new email (if verification succeeded)
        const cred = await signInWithEmailAndPassword(auth, pendingEmail, tempPasswordForEmailChange);
        currentUser = cred.user;
      } catch (e) {
        try {
          // Fallback to old email (if verification hasn't happened yet)
          const cred = await signInWithEmailAndPassword(auth, oldEmail, tempPasswordForEmailChange);
          currentUser = cred.user;
        } catch (e2) {
          console.error("Failed to re-authenticate during email change polling", e2);
        }
      }
    }

    if (!currentUser) return null;

    try {
      await currentUser.reload();
    } catch (error: any) {
      if (error.code === 'auth/user-token-expired' && tempPasswordForEmailChange) {
        try {
          const cred = await signInWithEmailAndPassword(auth, pendingEmail, tempPasswordForEmailChange);
          currentUser = cred.user;
        } catch (e) {
          try {
            const cred = await signInWithEmailAndPassword(auth, oldEmail, tempPasswordForEmailChange);
            currentUser = cred.user;
          } catch (e2) {
            return null;
          }
        }
      } else {
        console.error("Error reloading user:", error);
        return null;
      }
    }
    
    // If Auth email matches pending email, verification succeeded
    if (currentUser.email === pendingEmail) {
      await updateDoc(doc(db, 'users', uid), {
        pendingEmail: null,
        email: pendingEmail
      });

      tempPasswordForEmailChange = null; // Clear it

      // Send completion notifications
      try {
        // Notify old email (Security Alert)
        await emailService.sendEmail(
          oldEmail,
          'Security Alert: Your Email Address Has Been Changed',
          `<p>Hello ${userData.name},</p>
           <p>This is a security notification to inform you that the email address for your SkillBridge account has been successfully changed.</p>
           <p><strong>Old Email:</strong> ${oldEmail}</p>
           <p><strong>New Email:</strong> ${pendingEmail}</p>
           <p>If you did not authorize this change, please contact our security team immediately.</p>`
        );
        
        // Notify new email (Confirmation)
        await emailService.sendEmail(
          pendingEmail,
          'Email Address Successfully Updated',
          `<p>Hello ${userData.name},</p>
           <p>Your SkillBridge account email address has been successfully updated to <strong>${pendingEmail}</strong>.</p>
           <p>You should use this new email address for all future logins.</p>
           <p>Welcome to your new inbox!</p>`
        );
      } catch (e) {
        console.error("Failed to send email change completion notifications:", e);
      }

      return {
        uid,
        email: pendingEmail,
        name: userData.name,
        credits: userData.credits,
        pendingEmail: undefined,
        emailVerified: currentUser.emailVerified,
        purchaseHistory: userData.purchaseHistory || [],
        _emailChanged: true,
        _oldEmail: oldEmail
      } as User & { _emailChanged?: boolean, _oldEmail?: string };
    }

    return null; // No change or not verified yet
  },

  checkInitialEmailVerification: async (uid: string): Promise<User | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      await currentUser.reload();
    } catch (error: any) {
      if (error.code === 'auth/user-token-expired') {
        return null;
      }
      console.error("Error reloading user:", error);
    }
    
    if (currentUser.emailVerified) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let newCredits = userData.credits || 0;
        
        if (!userData.welcomeCreditsGranted) {
          newCredits += 10;
          await updateDoc(doc(db, 'users', uid), {
            credits: newCredits,
            welcomeCreditsGranted: true
          });
        }
        
        return {
          uid,
          email: userData.email,
          name: userData.name,
          credits: newCredits,
          pendingEmail: userData.pendingEmail,
          emailVerified: true,
          purchaseHistory: userData.purchaseHistory || []
        };
      }
    }
    return null;
  },

  resendEmailChangeVerification: async (newEmail: string, currentPassword?: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');
    
    if (currentPassword && currentUser.email) {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      try {
        await reauthenticateWithCredential(currentUser, credential);
      } catch (error: any) {
        if (error.code === 'auth/wrong-password') {
          throw new Error('Incorrect current password');
        }
        throw error;
      }
    }

    try {
      await verifyBeforeUpdateEmail(currentUser, newEmail);
    } catch (error: any) {
      console.error("Failed to resend verification email:", error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please enter your current password in the security section below and try resending.');
      }
      throw new Error(error.message || 'Failed to resend verification email.');
    }
  }
};

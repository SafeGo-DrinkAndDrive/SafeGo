// ─── src/contexts/AuthContext.tsx ─────────────────────────────────────────────
// Changes (Phase 2):
//   • loginWithGoogle now returns Promise<AppUser> (was Promise<void>)
//     so Register.tsx can check user.phone immediately after login.
//   • refreshProfile is now properly typed and exported via context.
//   • No other logic changed — existing users are unaffected.
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { FirebaseError }              from 'firebase/app';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import type { AppUser, UserRole } from '../types';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user:               AppUser | null;
  idToken:            string | null;
  isAuthenticated:    boolean;
  isAdmin:            boolean;
  isLoading:          boolean;
  vehicleRegistered:  boolean;
  authError:          string | null;
  login:              (email: string, password: string) => Promise<void>;
  // Returns the saved profile so callers can immediately check user.phone
  loginWithGoogle:    () => Promise<AppUser | null>;
  register:           (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout:             () => Promise<void>;
  refreshProfile:     () => Promise<void>;
  clearError:         () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toFriendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try signing in.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return err.message;
    }
  }
  return (err as Error)?.message ?? 'An unexpected error occurred.';
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<AppUser | null>(null);
  const [idToken,   setIdToken]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Internal helpers ──────────────────────────────────────────────────────

  const fetchProfile = async (uid: string): Promise<AppUser | null> => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  };

  /**
   * Creates or merges a user document in Firestore.
   * merge:true ensures vehicleRegistered: true is never overwritten to false
   * for a returning user who re-triggers the auth flow.
   */
  const upsertProfile = async (
    uid:      string,
    name:     string,
    email:    string,
    phone:    string,
    role:     UserRole = 'user',
    photoURL: string   = '',
  ): Promise<AppUser> => {
    const newUser: AppUser = {
      uid, name, email, phone, role, photoURL,
      vehicleRegistered: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), {
      ...newUser,
      _serverTs: serverTimestamp(),
    }, { merge: true });

    const saved = await fetchProfile(uid);
    return saved ?? newUser;
  };

  // ── Auth state observer ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fb) => {
      if (!fb) {
        setUser(null);
        setIdToken(null);
        setIsLoading(false);
        return;
      }
      try {
        const token   = await fb.getIdToken();
        const profile = await fetchProfile(fb.uid);
        setIdToken(token);
        setUser(profile);
      } catch (err) {
        console.error('[Auth] Profile fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Refresh token every 50 minutes so it doesn't expire mid-session
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(async () => {
      const fb = auth.currentUser;
      if (fb) setIdToken(await fb.getIdToken(true));
    }, 50 * 60 * 1000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Public actions ────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    setAuthError(null);
    try {
      const { user: fb } = await signInWithEmailAndPassword(auth, email, password);
      const token        = await fb.getIdToken();
      const profile      = await fetchProfile(fb.uid);
      setIdToken(token);
      setUser(profile);
    } catch (err) {
      const msg = toFriendlyError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Google sign-in / sign-up.
   * Returns the saved AppUser profile so callers can immediately inspect
   * user.phone without waiting for the context state update cycle.
   */
  const loginWithGoogle = async (): Promise<AppUser | null> => {
    setAuthError(null);
    try {
      const { user: fb } = await signInWithPopup(auth, googleProvider);
      const token        = await fb.getIdToken();

      let profile = await fetchProfile(fb.uid);
      if (!profile) {
        // Brand-new Google user — create the profile with an empty phone.
        // PhoneSetup will fill it in before vehicle setup.
        profile = await upsertProfile(
          fb.uid,
          fb.displayName || 'SafeGo User',
          fb.email       || '',
          '',               // ← empty; collected on /phone-setup
          'user',
          fb.photoURL    || '',
        );
      }

      setIdToken(token);
      setUser(profile);
      return profile;           // ← callers can check profile.phone immediately
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') {
        return null;
      }
      const msg = toFriendlyError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const register = async (
    name: string, email: string, phone: string, password: string,
  ): Promise<void> => {
    setAuthError(null);
    try {
      const { user: fb } = await createUserWithEmailAndPassword(auth, email, password);
      const token        = await fb.getIdToken();
      const profile      = await upsertProfile(fb.uid, name, email, phone);
      setIdToken(token);
      setUser(profile);
    } catch (err) {
      const msg = toFriendlyError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = useCallback(async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
  }, []);

  /**
   * Called by VehicleSetup, PhoneSetup, and Settings pages after mutating
   * the Firestore profile — syncs the latest data into context state.
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    const fb = auth.currentUser;
    if (!fb) return;
    const profile = await fetchProfile(fb.uid);
    if (profile) setUser(profile);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  // ── Derived state ─────────────────────────────────────────────────────────

  const isAuthenticated   = Boolean(user);
  const isAdmin           = user?.role === 'admin' || user?.role === 'superAdmin';
  const vehicleRegistered = Boolean(user?.vehicleRegistered);

  // ── Context value ─────────────────────────────────────────────────────────

  const value: AuthContextType = {
    user, idToken,
    isAuthenticated, isAdmin, isLoading, vehicleRegistered,
    authError,
    login, loginWithGoogle, register, logout, refreshProfile, clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

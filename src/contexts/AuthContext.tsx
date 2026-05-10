// ─── src/contexts/AuthContext.tsx ─────────────────────────────────────────────
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
  vehicleRegistered:  boolean;         // true once vehicle setup is complete
  authError:          string | null;
  login:              (email: string, password: string) => Promise<void>;
  loginWithGoogle:    () => Promise<void>;
  register:           (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout:             () => Promise<void>;
  refreshProfile:     () => Promise<void>;  // call after vehicle setup to sync state
  clearError:         () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<AppUser | null>(null);
  const [idToken,   setIdToken]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fetchProfile = async (uid: string): Promise<AppUser | null> => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  };

  // Creates or merges a user document.
  // vehicleRegistered defaults to false for brand-new users;
  // merge:true means an existing true value is never overwritten.
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

    // Re-read so we get any existing field values (e.g. vehicleRegistered: true)
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

  // Refresh token every 50 min
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(async () => {
      const fb = auth.currentUser;
      if (fb) setIdToken(await fb.getIdToken(true));
    }, 50 * 60 * 1000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
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

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const { user: fb } = await signInWithPopup(auth, googleProvider);
      const token        = await fb.getIdToken();
      let profile        = await fetchProfile(fb.uid);
      if (!profile) {
        profile = await upsertProfile(
          fb.uid,
          fb.displayName || 'SafeGo User',
          fb.email       || '',
          '',
          'user',
          fb.photoURL    || '',
        );
      }
      setIdToken(token);
      setUser(profile);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return;
      const msg = toFriendlyError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
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

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
  }, []);

  // Called by VehicleSetup after saving vehicle to Firestore
  // so AuthContext reflects vehicleRegistered: true immediately.
  const refreshProfile = useCallback(async () => {
    const fb = auth.currentUser;
    if (!fb) return;
    const profile = await fetchProfile(fb.uid);
    setUser(profile);
  }, []);

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      user,
      idToken,
      isAuthenticated:   !!user,
      isAdmin:           user?.role === 'admin',
      isLoading,
      vehicleRegistered: user?.vehicleRegistered ?? false,
      authError,
      login,
      loginWithGoogle,
      register,
      logout,
      refreshProfile,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};

// ── Error mapping ─────────────────────────────────────────────────────────────

function toFriendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':   return 'An account with this email already exists.';
      case 'auth/invalid-email':          return 'Please enter a valid email address.';
      case 'auth/weak-password':          return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':     return 'Invalid email or password.';
      case 'auth/too-many-requests':      return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default:                            return err.message;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

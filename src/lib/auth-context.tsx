"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { SIGNUP_TRIAL_TOKENS, CV_STATUSES } from "@/lib/constants";
import type { UserDoc } from "@/lib/types";

interface AuthContextValue {
  user: FirebaseUser | null;
  userDoc: UserDoc | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Create the user's Firestore doc on first sign-in only. We check existence first
 * (rather than setDoc+merge) so re-login never clobbers a wallet the user has spent
 * down or a profile/cv the team has touched. The trial-token grant is pinned to
 * SIGNUP_TRIAL_TOKENS and enforced by security rules on create.
 */
async function ensureUserDoc(user: FirebaseUser) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    email: user.email,
    displayName: user.displayName ?? null,
    role: "client",
    createdAt: serverTimestamp(),
    profile: null,
    wallet: {
      // Must match the create rule in firestore.rules: trial tokens are granted only
      // to a verified email, so an unverified signup starts empty and is topped up
      // after verification. Writing 5 here without a verified email is REJECTED.
      balance: user.emailVerified ? SIGNUP_TRIAL_TOKENS : 0,
      reserved: 0,
    },
    cv: {
      originalPath: null,
      improvedPath: null,
      status: CV_STATUSES.PENDIENTE_MEJORA,
      version: 0,
      updatedAt: null,
      clientNote: null,
      history: [],
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserDoc(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  // Completes a Google sign-in that fell back to a full-page redirect (see
  // signInWithGoogle) — in-app browsers block popups, so redirect is the only
  // path there. Ensures the user's Firestore doc exists on return.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => (result?.user ? ensureUserDoc(result.user) : undefined))
      .catch(() => {
        /* surfaced by the auth page's own error handling if it matters */
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsubDoc = onSnapshot(ref, (snap) => {
      setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
      setLoading(false);
    });
    return unsubDoc;
  }, [user]);

  const signUpWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(credential.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(credential.user);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      // Embedded/in-app browsers (Instagram, Facebook, TikTok, etc.) block
      // popups, which is a large share of mobile traffic. Fall back to a
      // full-page redirect, which those webviews support; getRedirectResult
      // (above) finishes the flow when the browser returns.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        loading,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

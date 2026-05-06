import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signInAnonymously,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Prefer environment variables injected by Vite (VITE_FIREBASE_*).
// Falls back to the committed config file for local development convenience.
// In production, set the VITE_FIREBASE_* env vars and do NOT commit the JSON file.
let firebaseConfig: Record<string, string>;
try {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  };
  // Use env config if at least the API key and project ID are set.
  if (envConfig.apiKey && envConfig.projectId) {
    firebaseConfig = envConfig as Record<string, string>;
  } else {
    // Fall back to the local config file (development only).
    const localConfig = await import("../../firebase-applet-config.json");
    firebaseConfig = localConfig.default ?? localConfig;
  }
} catch {
  // If neither source is available, initialise with an empty config.
  // Auth and Firestore calls will fail gracefully at runtime.
  firebaseConfig = {};
}

const resolvedConfig = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
};
const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-closed-by-user" ||
      err.message?.includes("Cross-Origin")
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
};

export const checkRedirectResult = () => getRedirectResult(auth);

export const signUpWithEmail = (email: string, password: string, displayName: string) =>
  createUserWithEmailAndPassword(auth, email, password).then(async (cred) => {
    await updateProfile(cred.user, { displayName });
    // Send verification email on every new signup (HIGH-08).
    try { await sendEmailVerification(cred.user); } catch {}
    return cred;
  });

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const resendVerificationEmail = () => {
  const user = auth.currentUser;
  if (user) return sendEmailVerification(user);
  return Promise.resolve();
};

export const signInAsGuest = () => signInAnonymously(auth);
export const signIn = signInWithGoogle;
export const signOut = () => auth.signOut();

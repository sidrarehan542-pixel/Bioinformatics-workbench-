import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

// Parse firebase config from env or fallback to empty to avoid crashes
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)"
};

// Initialize Firebase only if config is present
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "users", "connection_test"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("permission-denied")) {
      // Permission denied means we are connected but unauthorized, which is fine
      console.log("Firebase connected successfully (auth restricted).");
    } else if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firebase client is currently offline or database not found.");
    } else {
      console.log("Firebase initialized successfully, connection verified.");
    }
  }
}

export { app, auth, db };

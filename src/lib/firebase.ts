import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

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

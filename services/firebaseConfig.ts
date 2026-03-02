import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCA2VDVmG7BFfJGH3Lh4Elwh-O4y4GSWlU",
  authDomain: "al-mizan-law.firebaseapp.com",
  projectId: "al-mizan-law",
  storageBucket: "al-mizan-law.firebasestorage.app",
  messagingSenderId: "287795275811",
  appId: "1:287795275811:web:1d1a575271679bf0e62996",
  measurementId: "G-BXJSE84121"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Storage with proper CORS configuration
export const storage = getStorage(app, "gs://al-mizan-law.firebasestorage.app");

export default app;

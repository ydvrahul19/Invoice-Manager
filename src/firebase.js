import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqj-lmX0N8ajrxls99XRhFDiCUSGzUD9Q",
  authDomain: "invoice-manager-87b17.firebaseapp.com",
  projectId: "invoice-manager-87b17",
  storageBucket: "invoice-manager-87b17.firebasestorage.app",
  messagingSenderId: "1080495043041",
  appId: "1:1080495043041:web:c137bd333c4d5665e9a2a0",
  measurementId: "G-QLTJ7RJL71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, analytics, storage, db };

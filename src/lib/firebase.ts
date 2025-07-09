import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIkgVfiVwZIZcnhyRxmYauewGaoN2YwXs",
  authDomain: "wisely-e0d87.firebaseapp.com",
  projectId: "wisely-e0d87",
  storageBucket: "wisely-e0d87.appspot.com",
  messagingSenderId: "1052871511950",
  appId: "1:1052871511950:web:18578588d7d8f08c715edf",
  measurementId: "G-GFQ4ETVDXX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

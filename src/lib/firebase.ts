import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC3m0jvG-VnQDeLOuAKPPquhW-8Vnhgywg",
  authDomain: "cargoflow-j35du.firebaseapp.com",
  projectId: "cargoflow-j35du",
  storageBucket: "cargoflow-j35du.firebasestorage.app",
  messagingSenderId: "866863583313",
  appId: "1:866863583313:web:8164df2f5bfab9aa7b6870"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

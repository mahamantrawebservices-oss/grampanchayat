// Firebase SDK Import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// તમારી Firebase Details અહીં મૂકો
const firebaseConfig = {
  apiKey: "AIzaSyCMhWWI_6oxPIVEQEVlq2SIBf72EI2o8NI",
  authDomain: "gram-panchayat-33c86.firebaseapp.com",
  projectId: "gram-panchayat-33c86",
  storageBucket: "gram-panchayat-33c86.firebasestorage.app",
  messagingSenderId: "1025176315779",
  appId: "1:1025176315779:web:a24ca10a06c55edcc8f8b6",
  measurementId: "G-TQBSXCWNBV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

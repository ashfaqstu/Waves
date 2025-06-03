// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDhw3dM5WVOGHS0HlsY_aCKIf4EWDI0gYQ",
  authDomain: "wave-1ffd1.firebaseapp.com",
  projectId: "wave-1ffd1",
  storageBucket: "wave-1ffd1.firebasestorage.app",
  messagingSenderId: "126773480796",
  appId: "1:126773480796:web:cf6b610b532b7445730599",
  measurementId: "G-1H5H2R6KLV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };

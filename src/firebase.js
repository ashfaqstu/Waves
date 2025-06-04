import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDhw3dM5WVOGHS0HlsY_aCKIf4EWDI0gYQ",
  authDomain:        "wave-1ffd1.firebaseapp.com",
  projectId:         "wave-1ffd1",
  storageBucket:     "wave-1ffd1.appspot.com",   // ✔ correct
  messagingSenderId: "126773480796",
  appId:             "1:126773480796:web:cf6b610b532b7445730599",
};

const app  = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);

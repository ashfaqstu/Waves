import React, { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";

/* ---------- tiny Firebase bootstrap -------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDhw3dM5WVOGHS0HlsY_aCKIf4EWDI0gYQ",
  authDomain: "wave-1ffd1.firebaseapp.com",
  projectId: "wave-1ffd1",
  storageBucket: "wave-1ffd1.firebasestorage.app",
  messagingSenderId: "126773480796",
  appId: "1:126773480796:web:cf6b610b532b7445730599",
};
const db = getFirestore(initializeApp(firebaseConfig));

/* ---------- helper for tiny toasts ---------------------------------- */
const useToast = () => {
  const [msg, setMsg] = useState("");
  const pop = (t, ms = 2000) => { setMsg(t); setTimeout(() => setMsg(""), ms); };
  return [msg, pop];
};

/* ---------- component ---------------------------------------------- */
export default function ChatBox() {
  /* wizard step & role */
  const [step, setStep] = useState("role");   // role | login | register | send | read
  const [role, setRole] = useState(null);     // wave | heat

  /* heat auth */
  const [userId, setUserId] = useState("");
  const [pwd, setPwd]       = useState("");
  const [logged, setLogged] = useState(false);

  /* message form / list */
  const [recipient, setRecipient] = useState("");
  const [senderName, setSender]   = useState("");
  const [text, setText]           = useState("");
  const [msgs, setMsgs]           = useState([]);
  const msgsEnd = useRef(null);

  const [toast, pop] = useToast();

  /* read messages when heat is logged -------------------------------- */
  useEffect(() => {
    if (!(logged && role === "heat")) return;
    const q = query(
      collection(db, "messages"),
      where("recipientId", "==", userId),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, snap => {
      setMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      msgsEnd.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsub();
  }, [logged, role, userId]);

  /* auth -------------------------------------------------------------- */
  const doLogin = async () => {
    if (!userId || !pwd)           return pop("Enter ID & password");
    const snap = await getDocs(query(collection(db,"users"), where("userId","==",userId)));
    if (snap.empty)                return pop("ID not found");
    if (snap.docs[0].data().password !== pwd) return pop("Wrong password");
    setLogged(true);
    setStep("read");
  };

  const doRegister = async () => {
    if (!userId || !pwd)           return pop("Enter ID & password");
    const exists = await getDocs(query(collection(db,"users"), where("userId","==",userId)));
    if (!exists.empty)             return pop("ID already exists");
    await addDoc(collection(db,"users"), { userId, password: pwd });
    pop("Account created – log in");
    setStep("login");
  };

  /* send -------------------------------------------------------------- */
  const send = async () => {
    if (!recipient.trim() || !text.trim()) return;
    await addDoc(collection(db,"messages"),{
      recipientId : recipient.trim(),
      senderName  : logged ? userId : (senderName.trim() || "Anonymous"),
      senderId    : logged ? userId : null,
      personalChat: logged,
      text        : text.trim(),
      createdAt   : serverTimestamp(),
    });
    pop("Sent ✔︎");
    setText("");
    if (!logged) setRecipient("");
  };

  /* step navigation -------------------------------------------------- */
  const back = () => {
    if (step === "role") return;
    if (step === "login" || step === "register") { setStep("role"); return; }
    if (step === "send" || step === "read")       { setStep("role"); return; }
  };

  /* ----------------------------------------------------------------- */
  return (
    <div className="relative w-full rounded-2xl bg-white/10 backdrop-blur-md p-4 sm:p-6 text-white shadow-md">
      {/* back arrow */}
      {step !== "role" && (
        <button onClick={back} className="absolute left-3 top-3 text-xl">←</button>
      )}

      {/* toast */}
      {toast && <p className="absolute right-4 top-3 text-xs text-pink-200 animate-pulse">{toast}</p>}

      {/* role --------------------------------------------------------- */}
      {step === "role" && (
        <>
          <h2 className="text-center text-2xl font-bold mb-6">Choose role</h2>
          <div className="flex gap-4">
            <button
              className="flex-1 py-3 bg-pink-500 rounded-lg hover:bg-pink-600 transition"
              onClick={() => { setRole("wave"); setStep("send"); }}
            >
              Wave&nbsp;(Send)
            </button>
            <button
              className="flex-1 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
              onClick={() => { setRole("heat"); setStep("login"); }}
            >
              Heat&nbsp;(Read)
            </button>
          </div>
        </>
      )}

      {/* login -------------------------------------------------------- */}
      {step === "login" && (
        <>
          <h2 className="text-xl font-bold mb-4">Heat Login</h2>
          <input
            placeholder="User ID"
            value={userId}
            onChange={e=>setUserId(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={e=>setPwd(e.target.value)}
            className="w-full p-2 mb-4 rounded text-black"
          />
          <button onClick={doLogin}
            className="w-full py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition">
            Login
          </button>
          <p className="mt-3 text-center text-sm underline cursor-pointer"
            onClick={()=>setStep("register")}>
            Need an account? Register
          </p>
        </>
      )}

      {/* register ----------------------------------------------------- */}
      {step === "register" && (
        <>
          <h2 className="text-xl font-bold mb-4">Create Heat Account</h2>
          <input
            placeholder="Choose User ID"
            value={userId}
            onChange={e=>setUserId(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={e=>setPwd(e.target.value)}
            className="w-full p-2 mb-4 rounded text-black"
          />
          <button onClick={doRegister}
            className="w-full py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition">
            Register
          </button>
        </>
      )}

      {/* send ---------------------------------------------------------- */}
      {step === "send" && (
        <>
          <h2 className="text-xl font-bold mb-4">Send a Wave</h2>
          <input
            placeholder="Recipient ID"
            value={recipient}
            onChange={e=>setRecipient(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          <input
            placeholder="Your name (optional)"
            value={senderName}
            onChange={e=>setSender(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          <textarea
            rows={4}
            placeholder="Message"
            value={text}
            onChange={e=>setText(e.target.value)}
            className="w-full p-2 mb-4 rounded resize-none text-black"
          />
          <button onClick={send}
            className="w-full py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition">
            Send
          </button>
        </>
      )}

      {/* read ---------------------------------------------------------- */}
      {step === "read" && (
        <>
          <h2 className="text-xl font-bold mb-4">Messages for {userId}</h2>
          <div className="h-64 overflow-y-auto bg-white/5 rounded p-3 space-y-3">
            {msgs.length === 0 ? (
              <p className="italic text-center text-white/60">No messages yet</p>
            ) : (
              msgs.map(m => (
                <div key={m.id} className="bg-white/10 p-2 rounded text-sm">
                  <strong>{m.senderName}:</strong><br />{m.text}
                </div>
              ))
            )}
            <div ref={msgsEnd}/>
          </div>
        </>
      )}
    </div>
  );
}

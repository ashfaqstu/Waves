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

// Firebase config (replace with yours)
const firebaseConfig = {
  apiKey: "AIzaSyDhw3dM5WVOGHS0HlsY_aCKIf4EWDI0gYQ",
  authDomain: "wave-1ffd1.firebaseapp.com",
  projectId: "wave-1ffd1",
  storageBucket: "wave-1ffd1.firebasestorage.app",
  messagingSenderId: "126773480796",
  appId: "1:126773480796:web:cf6b610b532b7445730599",
  measurementId: "G-1H5H2R6KLV",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function CozyChatBox() {
  const [role, setRole] = useState(null); // "wave" or "heat"
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [recipientId, setRecipientId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [messageStatus, setMessageStatus] = useState(null); // "success" | "error" | null

  // Load messages for Heat (recipient)
  useEffect(() => {
    if (!isLoggedIn || role !== "heat") {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "messages"),
      where("recipientId", "==", userId),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, [isLoggedIn, userId, role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Login handler
  const login = async () => {
    setLoginError("");
    if (!userId || !password) {
      setLoginError("Please enter both ID and password.");
      return;
    }
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setLoginError("User ID not found.");
        return;
      }
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.password !== password) {
        setLoginError("Incorrect password.");
        return;
      }
      setIsLoggedIn(true);
      setRegisterError("");
      setRegisterSuccess("");
    } catch (err) {
      setLoginError("Login error: " + err.message);
    }
  };

  // Register handler
  const register = async () => {
    setRegisterError("");
    setRegisterSuccess("");
    if (!userId || !password) {
      setRegisterError("Please enter both ID and password.");
      return;
    }
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setRegisterError("User ID already exists.");
        return;
      }
      await addDoc(usersRef, { userId, password });
      setRegisterSuccess("Account created! Please login.");
      setIsRegistering(false);
      setUserId("");
      setPassword("");
      setLoginError("");
    } catch (err) {
      setRegisterError("Registration error: " + err.message);
    }
  };

  // Logout handler
  const logout = () => {
    setIsLoggedIn(false);
    setUserId("");
    setPassword("");
    setMessages([]);
    setRole(null);
  };

  // Send message handler
  const sendMessage = async () => {
    if (!newMsg.trim()) return;

    let recipient = recipientId.trim();
    let name = senderName.trim() || "Anonymous";

    if (role === "heat" && !recipient) return;
    if (role === "wave" && !recipient) return;

    const senderId = isLoggedIn ? userId : null;
    const personalChat = isLoggedIn;

    try {
      await addDoc(collection(db, "messages"), {
        recipientId: recipient,
        senderName: isLoggedIn ? userId : name,
        senderId,
        text: newMsg.trim(),
        createdAt: serverTimestamp(),
        personalChat,
      });

      setMessageStatus("success");
      setNewMsg("");
      if (role === "wave" && !isLoggedIn) {
        setRecipientId("");
        setSenderName("");
      }
    } catch (err) {
      setMessageStatus("error");
      console.error("Message sending failed:", err);
    }

    setTimeout(() => setMessageStatus(null), 2000);
  };

  // Render
  if (!role) {
    // Role selection screen
    return (
      <div className="max-w-2xl mx-auto p-6 bg-purple-900 text-white rounded-lg shadow-lg flex flex-col items-center space-y-6">
        <h2 className="text-3xl font-bold">Choose your role</h2>
        <div className="flex space-x-10">
          <button
            onClick={() => setRole("wave")}
            className="px-10 py-4 bg-pink-500 rounded-lg shadow hover:bg-pink-600 transition"
          >
            Wave (Sender)
          </button>
          <button
            onClick={() => setRole("heat")}
            className="px-10 py-4 bg-purple-700 rounded-lg shadow hover:bg-purple-800 transition"
          >
            Heat (Recipient)
          </button>
        </div>
      </div>
    );
  }

  // Logged in UI
  return (
    <div className="max-w-3xl mx-auto p-6 bg-purple-900 text-white rounded-lg shadow-lg relative">
      {role === "heat" && !isLoggedIn ? (
        <>
          <h2 className="text-2xl font-bold mb-4">Login as Heat (Recipient)</h2>
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          {loginError && <p className="text-red-400 mb-2">{loginError}</p>}
          <button
            onClick={login}
            className="w-full bg-pink-500 py-2 rounded hover:bg-pink-600 transition mb-3"
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsRegistering(true);
              setLoginError("");
            }}
            className="w-full bg-purple-700 py-2 rounded hover:bg-purple-800 transition"
          >
            Create an Account
          </button>
          {isRegistering && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold mb-3">Register</h3>
              <input
                type="text"
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full p-2 mb-3 rounded text-black"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 mb-3 rounded text-black"
              />
              {registerError && (
                <p className="text-red-400 mb-2">{registerError}</p>
              )}
              {registerSuccess && (
                <p className="text-green-400 mb-2">{registerSuccess}</p>
              )}
              <button
                onClick={register}
                className="w-full bg-purple-700 py-2 rounded hover:bg-purple-800 transition mb-3"
              >
                Register
              </button>
              <button
                onClick={() => setIsRegistering(false)}
                className="underline text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-4">
            {role === "wave" ? "Wave (Sender)" : `Welcome, ${userId}`}
          </h2>
          {role === "heat" && (
            <button
              onClick={logout}
              className="mb-4 bg-red-600 py-2 rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          )}

          {/* Message form */}
          <input
            type="text"
            placeholder="Recipient ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full p-2 mb-3 rounded text-black"
          />
          {role === "wave" && (
            <input
              type="text"
              placeholder="Your Name (Optional)"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full p-2 mb-3 rounded text-black"
            />
          )}
          <textarea
            rows={4}
            placeholder="Type your message"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            className="w-full p-2 mb-3 rounded resize-none text-black"
          />

          <div className="relative">
            <button
              onClick={sendMessage}
              className="w-full bg-pink-500 py-2 rounded hover:bg-pink-600 transition"
            >
              Send Message
            </button>

            {messageStatus === "success" && (
              <div className="absolute -top-10 right-4 animate-pop text-3xl select-none">
                🐱sent
              </div>
            )}
            {messageStatus === "error" && (
              <div className="absolute -top-10 right-4 animate-pop text-3xl select-none">
                😿not sent
              </div>
            )}
          </div>

          {/* Show messages only if logged in Heat */}
          {role === "heat" && isLoggedIn && (
            <>
              <h3 className="mt-6 mb-2 font-semibold">Messages to You</h3>
              <div className="max-h-48 overflow-y-auto border border-pink-300 rounded p-2 bg-pink-50 text-pink-900">
                {messages.length === 0 ? (
                  <p className="italic">No messages yet.</p>
                ) : (
                  messages.map(({ id, text, senderName }) => (
                    <div key={id} className="mb-2 border-b border-pink-200 pb-1">
                      <strong>{senderName}:</strong> {text}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes pop {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        .animate-pop {
          animation: pop 2s ease forwards;
        }
      `}</style>
    </div>
  );
}

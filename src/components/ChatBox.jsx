// src/components/ChatBox.jsx
/*  ChatBox.jsx
    ────────────────────────────────────────────────────────────────
    • Now accepts `initialStep` (defaults to "login") and
      `initialPartner` (waveId from the query param), so that
      after login or if already logged in, it will open DM with that partner.
    • Entry / anonSend are removed; we handle them in Home.jsx now.
    • Everything else (heat, waveList, waveChat, settings) remains.
*/

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, getDocs,
  deleteDoc, updateDoc
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from "firebase/auth";
import { db } from "../firebase";

/* ─────────── hooks & small helpers ─────────── */
const useToast = () => {
  const [msg, setMsg] = useState("");
  const pop = (t, ms = 2200) => { setMsg(t); setTimeout(() => setMsg(""), ms); };
  return [msg, pop];
};
const useScrollBottom = () => {
  const end = useRef(null);
  const scroll = useCallback(() => end.current?.scrollIntoView({ behavior: "smooth" }), []);
  return [end, scroll];
};

/* Firestore helpers */
const saveContact = async (owner, partner, name) =>
  addDoc(collection(db, "contacts"), {
    ownerId: owner,
    partnerId: partner,
    ...(name ? { partnerName: name } : {}),
    createdAt: serverTimestamp(),
  });

const saveMutual = (a, b, aName, bName) =>
  Promise.all([
    saveContact(a, b, bName).catch(() => {}),
    saveContact(b, a, aName).catch(() => {}),
  ]);

const deleteMutual = async (a, b) => {
  const rm = async (owner, partner) => {
    const snap = await getDocs(
      query(
        collection(db, "contacts"),
        where("ownerId", "==", owner),
        where("partnerId", "==", partner)
      )
    );
    return Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  };
  await Promise.all([rm(a, b), rm(b, a)]);
};

/* ─────────── tiny UI atoms ─────────── */
const Panel = ({ back, toast, children }) => (
  <div className="relative w-full rounded-xl bg-white/10 backdrop-blur-md
                  p-4 sm:p-6 text-white shadow-lg">
    {back && (
      <button onClick={back} className="absolute left-3 top-3">←</button>
    )}
    {toast && (
      <p className="absolute right-4 top-3 text-xs text-pink-200 animate-pulse">
        {toast}
      </p>
    )}
    {children}
  </div>
);

const Btn = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`w-full py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition-all duration-300 ease-out ${className}`}>
    {children}
  </button>
);

const Input = ({ ph, v, s, pw = false, onKey }) => (
  <input
    type={pw ? "password" : "text"}
    placeholder={ph}
    value={v}
    onChange={e => s(e.target.value)}
    onKeyDown={onKey}
    className="w-full p-2 mb-3 rounded text-black"
  />
);

const Textarea = ({ v, s, onKeyDown }) => (
  <textarea
    rows={4}
    placeholder="Message"
    value={v}
    onChange={e => s(e.target.value)}
    onKeyDown={onKeyDown}
    className="w-full p-2 mb-4 rounded resize-none text-black"
  />
);

/* ─────────── component ─────────── */
export default function ChatBox({
  initialStep = "login",
  initialPartner = null // if non-null, a Wave-ID to immediately open DM with
}) {
  const [step, setStep] = useState(initialStep);
    // possible: login | register | googleInit | choose | settings | heat | waveList | waveChat

  /* auth/profile */
  const [userId, setUserId] = useState("");
  const [password, setPwd] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [userDoc, setUserDoc] = useState(null); // {uid,userId,pseudoname}
  const logged = !!userDoc;
  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  /* chat state */
  const [heatMsgs, setHeatMsgs] = useState([]);
  const [contacts, setContacts] = useState([]);   // raw contacts
  const [partners, setPartners] = useState([]);   // enriched with unread & lastTs
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [dmMsgs, setDmMsgs] = useState([]);
  const [text, setText] = useState("");
  const [newWaveId, setNewWaveId] = useState("");
  const [search, setSearch] = useState("");

  const [heatEnd, scrollHeat] = useScrollBottom();
  const [dmEnd,   scrollDm]   = useScrollBottom();
  const [toast,   pop]        = useToast();

  /* ─── boot: restore local session OR observe Firebase auth ─── */
  useEffect(() => {
    const saved = localStorage.getItem("waveUser");
    if (saved) {
      setUserDoc(JSON.parse(saved));
      setStep(initialStep === "waveChat" && initialPartner ? "waveChat" : "choose");
    } else {
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { setStep("login"); return; }
        // look up profile in users collection
        const snap = await getDocs(
          query(collection(db,"users"), where("uid","==",firebaseUser.uid))
        );
        if (snap.empty) {
          // first google login → ask for id + pseudo
          setUserDoc({ uid: firebaseUser.uid });   // temporarily store uid
          setStep("googleInit");
        } else {
          const data = snap.docs[0].data();
          const u = { uid: data.uid, userId: data.userId, pseudoname: data.pseudoname };
          setUserDoc(u);
          localStorage.setItem("waveUser", JSON.stringify(u));
          // If we have an initialPartner provided, jump straight into waveChat:
          if (initialPartner) {
            setPartnerId(initialPartner);
            setPartnerName(initialPartner);
            setStep("waveChat");
          } else {
            setStep("choose");
          }
        }
      });
      return ()=>unsub();
    }
  }, [initialStep, initialPartner]);

  /* If user logs in (step→choose), but we have initialPartner, immediately open DM */
  useEffect(() => {
    if (logged && step === "choose" && initialPartner) {
      setPartnerId(initialPartner);
      setPartnerName(initialPartner);
      setStep("waveChat");
    }
  }, [logged, step, initialPartner]);

  /* ─── Heat listener ─── */
  useEffect(() => {
    if (!(logged && step==="heat")) return;
    const q = query(
      collection(db,"messages"),
      where("recipientId","==", userDoc.userId),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q,snap=>{
      setHeatMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
      scrollHeat();
    });
    return ()=>unsub();
  },[logged,step,userDoc]);

  /* contacts listener ─── */
  useEffect(()=>{
    if(!(logged&&(step==="waveList"||step==="choose"))) return;
    const unsub = onSnapshot(
      query(collection(db,"contacts"), where("ownerId","==",userDoc.userId)),
      snap => {
        const list = snap.docs.map(d=>({
          id: d.data().partnerId,
          name: d.data().partnerName || d.data().partnerId,
        }));
        setContacts(list);
      }
    );
    return ()=>unsub();
  },[logged,step,userDoc]);

  /* unread counts & recency meta ─── */
  useEffect(()=>{
    if(!logged||contacts.length===0) return;
    const unsub = onSnapshot(
      query(
        collection(db,"messages"),
        where("personalChat","==",true),
        orderBy("createdAt","desc")
      ),
      snap=>{
        const meta = new Map(
          contacts.map(c=>[c.id,{...c, unread:0, lastTs:0}])
        );
        snap.docs.forEach(d=>{
          const m = d.data();
          if(!(m.senderId===userDoc.userId||m.recipientId===userDoc.userId)) return;
          const other = m.senderId===userDoc.userId ? m.recipientId : m.senderId;
          if(!meta.has(other)) return;
          const e = meta.get(other);
          const ts = m.createdAt?.toMillis?.()||0;
          if(ts>e.lastTs) e.lastTs = ts;
          if(!m.read && m.senderId===other && m.recipientId===userDoc.userId)
            e.unread += 1;
        });
        setPartners([...meta.values()].sort((a,b)=>b.lastTs - a.lastTs));
      }
    );
    return ()=>unsub();
  },[logged,contacts,userDoc]);

  /* DM listener + mark read on open ─── */
  useEffect(()=>{
    if(!(logged && step==="waveChat" && partnerId)) { setDmMsgs([]); return; }
    const q = query(
      collection(db,"messages"),
      where("personalChat","==",true),
      where("senderId","in",[userDoc.userId,partnerId]),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, async snap=>{
      const batch = [];
      const list = [];
      snap.docs.forEach(doc=>{
        const m = doc.data();
        if(
          (m.senderId===userDoc.userId && m.recipientId===partnerId) ||
          (m.senderId===partnerId   && m.recipientId===userDoc.userId)
        ) {
          list.push({id:doc.id,...m});
          if(!m.read && m.senderId===partnerId && m.recipientId===userDoc.userId)
            batch.push(updateDoc(doc.ref,{read:true}));
        }
      });
      if(batch.length) await Promise.all(batch);
      setDmMsgs(list);
      scrollDm();
    });
    return ()=>unsub();
  },[logged,step,partnerId,userDoc]);

  /* ─── auth helpers ─── */
  const register = async()=>{
    if(!userId||!password||!pseudo) return pop("Fill all fields");
    const dup = await getDocs(query(collection(db,"users"), where("userId","==",userId)));
    if(!dup.empty) return pop("ID exists");
    await addDoc(collection(db,"users"),{userId,password,pseudoname:pseudo});
    pop("Account created"); setStep("login");
  };
  const manualLogin = async()=>{
    if(!userId||!password) return pop("Enter credentials");
    const snap = await getDocs(query(collection(db,"users"),where("userId","==",userId)));
    if(snap.empty) return pop("ID not found");
    const d = snap.docs[0].data();
    if(d.password!==password) return pop("Wrong password");
    const u = { uid:null, userId:d.userId, pseudoname:d.pseudoname };
    setUserDoc(u);
    localStorage.setItem("waveUser", JSON.stringify(u));
    // If there was an initialPartner, after setUserDoc, our useEffect will fire and switch to waveChat.
    // Otherwise go to choose.
    if(!initialPartner) setStep("choose");
  };
  const googleSignIn = ()=> signInWithPopup(auth,provider).catch(()=>pop("Google sign-in failed"));
  const logout = ()=>
    signOut(auth)
      .catch(()=>{})
      .then(()=>{
        localStorage.removeItem("waveUser");
        setUserDoc(null);
        setStep("login");
      });
  const saveGoogleInit = async()=>{
    if(!userId||!pseudo) return pop("Fill both");
    const dup = await getDocs(query(collection(db,"users"),where("userId","==",userId)));
    if(!dup.empty) return pop("ID exists");
    await addDoc(collection(db,"users"), {
      uid: auth.currentUser.uid,
      userId,
      pseudoname: pseudo
    });
    const u = { uid: auth.currentUser.uid, userId, pseudoname: pseudo };
    setUserDoc(u);
    localStorage.setItem("waveUser", JSON.stringify(u));
    // If initialPartner present, go straight to waveChat
    if(initialPartner) {
      setPartnerId(initialPartner);
      setPartnerName(initialPartner);
      setStep("waveChat");
    } else {
      setStep("choose");
    }
  };

  /* ─── send DM ─── */
  const sendDm = async()=>{
    if(!partnerId.trim()||!text.trim())return;
    try {
      await addDoc(collection(db,"messages"),{
        recipientId:partnerId.trim(),
        senderName:userDoc.pseudoname,
        senderId:userDoc.userId,
        personalChat:true,
        text,
        read:false,
        createdAt:serverTimestamp(),
      });
      setText("");
    } catch {
      pop("Message failed");
    }
  };

  /* ─── start Wave by ID ─── */
  const startWaveById = ()=>{
    const id = newWaveId.trim();
    if(!id) return;
    setPartnerId(id);
    setPartnerName(id);
    setStep("waveChat");
    setNewWaveId("");
  };

  /* ─── settings edit ─── */
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const openSettings = ()=>{
    setNewId(userDoc.userId);
    setNewName(userDoc.pseudoname);
    setStep("settings");
  };
  const saveSettings = async()=>{
    if(!newId||!newName)return pop("Fill both");
    if(
      newId!==userDoc.userId&&
      !(await getDocs(query(collection(db,"users"),where("userId","==",newId)))).empty
    ) return pop("ID exists");

    const snap = await getDocs(
      query(
        collection(db,"users"),
        userDoc.uid ? where("uid","==",userDoc.uid) : where("userId","==",userDoc.userId)
      )
    );
    await Promise.all(snap.docs.map(d=> updateDoc(d.ref,{ userId:newId, pseudoname:newName })));

    /* update contacts */
    const c1 = await getDocs(query(collection(db,"contacts"),where("ownerId","==",userDoc.userId)));
    const c2 = await getDocs(query(collection(db,"contacts"),where("partnerId","==",userDoc.userId)));
    await Promise.all([
      ...c1.docs.map(d=>updateDoc(d.ref,{ ownerId:newId })),
      ...c2.docs.map(d=>updateDoc(d.ref,{ partnerId:newId, partnerName:newId }))
    ]);

    const u = { ...userDoc, userId:newId, pseudoname:newName };
    setUserDoc(u);
    localStorage.setItem("waveUser", JSON.stringify(u));
    pop("Profile updated");
    setStep("choose");
  };

  /* ─── key helpers ─── */
  const onLoginEnter = e => e.key === "Enter" && manualLogin();
  const onRegEnter   = e => e.key === "Enter" && register();
  const onGoEnter    = e => e.key === "Enter" && saveGoogleInit();
  const onMsgKey     = e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendDm(); } };

  /* ─── search + sort ─── */
  const filtered = partners.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  /* ─────────── UI branches ─────────── */

  /* login */
  if(step==="login")
    return (
      <Panel toast={toast}>
        <h2 className="title mb-4">Login</h2>
        <Input ph="User ID" v={userId} s={setUserId}/>
        <Input ph="Password" v={password} s={setPwd} pw onKey={onLoginEnter}/>
        <Btn onClick={manualLogin}>Login</Btn>
        <Btn className="mt-3 bg-purple-600 hover:bg-purple-700" onClick={googleSignIn}>
          Login&nbsp;with&nbsp;Google
        </Btn>
        <p className="link mt-3" onClick={()=>setStep("register")}>
          Need an account? Register
        </p>
      </Panel>
    );

  /* register */
  if(step==="register")
    return (
      <Panel back={()=>setStep("login")} toast={toast}>
        <h2 className="title mb-4">Create account</h2>
        <Input ph="User ID" v={userId} s={setUserId}/>
        <Input ph="Password" v={password} s={setPwd} pw onKey={onRegEnter}/>
        <Input ph="Pseudoname" v={pseudo} s={setPseudo}/>
        <Btn onClick={register}>Register</Btn>
      </Panel>
    );

  /* googleInit */
  if(step==="googleInit")
    return(
      <Panel toast={toast}>
        <h2 className="title mb-4">Set up your Wave profile</h2>
        <Input ph="Wave ID" v={userId} s={setUserId} onKey={onGoEnter}/>
        <Input ph="Pseudoname" v={pseudo} s={setPseudo}/>
        <Btn onClick={saveGoogleInit}>Save</Btn>
      </Panel>
    );

  /* choose role */
  if(step==="choose")
    return(
      <Panel>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="title mb-0">{userDoc.pseudoname}</h2>
            <button onClick={openSettings} title="Settings">⚙️</button>
          </div>
          <button onClick={logout} className="text-xs underline text-pink-200">
            Logout
          </button>
        </div>
        <div className="flex gap-4">
        <Btn onClick={()=>setStep("heat")}>Heat</Btn>
          <Btn onClick={()=>setStep("waveList")}>Waves</Btn>
          
        </div>
      </Panel>
    );

  /* settings */
  if(step==="settings")
    return(
      <Panel back={()=>setStep("choose")} toast={toast}>
        <h2 className="title mb-4">Edit profile</h2>
        <Input ph="New Wave-ID" v={newId} s={setNewId}/>
        <Input ph="New Pseudoname" v={newName} s={setNewName} onKey={e=>e.key==="Enter"&&saveSettings()}/>
        <Btn onClick={saveSettings}>Save changes</Btn>
      </Panel>
    );

  /* Heat */
  if(step==="heat")
    return (
      <Panel back={()=>setStep("choose")} toast={toast}>
        <h2 className="title mb-2">Inbox for {userDoc.userId}</h2>
        <div className="h-72 overflow-y-auto space-y-3 pr-1">
          {heatMsgs.length===0
            ? <p className="italic text-white/60">No messages</p>
            : heatMsgs.map(m=>(
                <div key={m.id} className="bg-white/10 p-3 rounded text-sm space-y-1">
                  {m.senderId
                    ? (
                      <span
                        onClick={()=>saveMutual(userDoc.userId,m.senderId,userDoc.pseudoname,m.senderName)}
                        className="font-semibold cursor-pointer hover:text-pink-300 hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]">
                        {m.senderName}
                      </span>
                    )
                    : (
                      <span className="font-semibold">
                        {m.senderName}
                      </span>
                    )
                  }
                  <span>: {m.text}</span>
                </div>
              ))
          }
          <div ref={heatEnd}/>
        </div>
      </Panel>
    );

  /* Wave list */
  if(step==="waveList")
    return (
      <Panel back={()=>setStep("choose")}>
        <h2 className="title mb-4">Your waves</h2>

        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="Search contact…"
          className="w-full p-2 mb-3 rounded text-black"
        />

        <div className="relative mb-6 p-4 bg-white/10 rounded border-2 border-white/50 my-4">
          <input
            value={newWaveId}
            onChange={e=>setNewWaveId(e.target.value)}
            placeholder="Wave-ID"
            className="w-full p-2 pr-20 rounded text-black placeholder-wave"
          />
          <button
            onClick={startWaveById}
            className="absolute right-0 top-0 h-full w-1/3 px-4 rounded-r
                       bg-pink-500 hover:bg-pink-600 transition">
            Start
          </button>
        </div>

        {filtered.length===0
          ? <p className="italic text-center text-white/60">No chats</p>
          : filtered.map(p=>(
              <div key={p.id} className="flex items-center gap-2 mb-2">
                <Btn
                  className="flex-1 flex justify-between items-center"
                  onClick={()=>{
                    setPartnerId(p.id); setPartnerName(p.name); setStep("waveChat");
                  }}
                >
                  <span>{p.name}</span>
                  {p.unread>0 && (
                    <span className="ml-2 bg-red-600 px-2 rounded-full text-xs">
                      {p.unread}
                    </span>
                  )}
                </Btn>
                <button
                  title="Remove"
                  onClick={()=>deleteMutual(userDoc.userId,p.id)}
                  className="text-lg leading-none hover:text-pink-300">
                  ×
                </button>
              </div>
            ))
        }
      </Panel>
    );

  /* Wave chat */
  if(step==="waveChat")
    return (
      <Panel back={()=>setStep("waveList")} toast={toast}>
        <h2 className="title mb-1">{partnerName}</h2>
        <div className="h-56 overflow-y-auto space-y-2 pr-1 mt-2">
          {dmMsgs.map(m=>(
            <div key={m.id}
                 className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow
                             ${m.senderId===userDoc.userId ? "bg-pink-500 self-end" : "bg-white/10"}`}>
              {m.text}
            </div>
          ))}
          <div ref={dmEnd}/>
        </div>
        <Textarea v={text} s={setText} onKeyDown={onMsgKey}/>
        <Btn onClick={sendDm}>Send</Btn>
      </Panel>
    );

  return null;
}

/* ─────────── inject minimal CSS once ─────────── */
if(!document.getElementById("chatbox-css")){
  const style = document.createElement("style");
  style.id="chatbox-css";
  style.textContent=`
    .title{font-size:1.25rem;font-weight:700;text-align:center;margin-bottom:1rem}

    /* Wave chat grow-and-fade */
    @keyframes chatGrow{
      0%   {opacity:0;transform:scale(.9);}
      60%  {opacity:1;transform:scale(1.03);}
      100% {opacity:1;transform:scale(1);}
    }
    .animate-chatGrow{animation:chatGrow .45s cubic-bezier(.25,.8,.25,1) both;}

    /* placeholder bobbing */
    @keyframes waveBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}
    .placeholder-wave::placeholder{animation:waveBob 2.8s cubic-bezier(.45,.05,.55,.95) infinite;}
  `;
  document.head.appendChild(style);
}

// src/components/ChatBox.jsx
/*  ChatBox.jsx
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
import StoryComposer from "./StoryComposer";

const storyImgs = [
  "/assets/cat1.gif",
  "/assets/cat2.gif",
  "/assets/cat.png",
];
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

const blockUserId = async (blocker, blocked, name = null) => {
  const snap = await getDocs(
    query(
      collection(db, "contacts"),
      where("ownerId", "==", blocker),
      where("partnerId", "==", blocked)
    )
  );
  const blockedName = snap.empty ? name : snap.docs[0].data().partnerName;
  await addDoc(collection(db, "blocks"), {
    blockerId: blocker,
    blockedId: blocked,
    createdAt: serverTimestamp(),
     wasContact: !snap.empty,
    blockedName,
  });
  await deleteMutual(blocker, blocked).catch(() => {});
};

const shareProfileLink = (id, toast) => {
  const url = `${window.location.origin}/?waveId=${encodeURIComponent(id)}`;
  if (navigator.share) {
    navigator.share({ url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast && toast("Link copied"));
  }
};

/* ─────────── tiny UI atoms ─────────── */
const Panel = ({ back, toast, children }) => (
  <div className="relative w-full rounded-xl bg-white/10 backdrop-blur-md
                  p-4 sm:p-6 text-white/90 shadow-lg pixel-border retro-glow">
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
  initialPartner = null, // if non-null, a Wave-ID to immediately open DM with
}) {
  const [step, setStep] = useState(initialStep);
  // possible: login | register | googleInit | forgot | choose | settingsMenu |
  //   settingsProfile | settingsBlock | heat | waveList | waveChat

  // navigating back won't auto-open it again
  const [prefillUsed, setPrefillUsed] = useState(false);
  /* auth/profile */
  const [userId, setUserId] = useState("");
  const [password, setPwd] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [userDoc, setUserDoc] = useState(""); // {uid,userId,pseudoname}
  const [email, setEmail] = useState("");
  // Consider the user "logged" only once we have a profile with a userId
  const logged = !!(userDoc && userDoc.userId);
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
  const [blocked, setBlocked] = useState(new Set());
  const [blockedNames, setBlockedNames] = useState({});
  const [activeHeat, setActiveHeat] = useState(null); // id of heat msg showing actions

  const [heatEnd, scrollHeat] = useScrollBottom();
  const [dmEnd,   scrollDm]   = useScrollBottom();
  const [toast,   pop]        = useToast();
  const [shareMenu, setShareMenu] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [randomStoryImg, setRandomStoryImg] = useState(storyImgs[0]);
  const [showHeatStory, setShowHeatStory] = useState(false);
  const [storyMessage, setStoryMessage] = useState("");

  // hide heat action buttons on outside click
  useEffect(() => {
    if (!activeHeat) return;
    const handler = () => setActiveHeat(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeHeat]);

  /* ─── boot: restore local session OR observe Firebase auth ─── */
  useEffect(() => {
    const saved = localStorage.getItem("waveUser");
    if (saved) {
      setUserDoc(JSON.parse(saved));
      const openChat = initialStep === "waveChat" && initialPartner;
      setStep(openChat ? "waveChat" : "choose");
      if (openChat) setPrefillUsed(true);
    } else {
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { setStep("login"); return; }
        // look up profile in users collection
        const snap = await getDocs(
          query(collection(db,"users"), where("uid","==",firebaseUser.uid))
        );
        if (snap.empty) {
          // first google login → ask for id + pseudo + password
          setUserDoc({ uid: firebaseUser.uid, email: firebaseUser.email });
          setEmail(firebaseUser.email);
          setStep("googleInit");
        } else {
          const data = snap.docs[0].data();
          const u = { uid: data.uid, userId: data.userId, pseudoname: data.pseudoname, email: data.email };
          setUserDoc(u);
          localStorage.setItem("waveUser", JSON.stringify(u));
          // If we have an initialPartner provided, jump straight into waveChat:
          if (initialPartner) {
            setPartnerId(initialPartner);
            setPartnerName(initialPartner);
            setStep("waveChat");
            setPrefillUsed(true);
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
  if (logged && step === "choose" && initialPartner && !prefillUsed) {
    setPartnerId(initialPartner);
    setPartnerName(initialPartner);
    setStep("waveChat");
    setPrefillUsed(true);
  }
}, [logged, step, initialPartner, prefillUsed]);

  /* ─── Heat listener ─── */
  useEffect(() => {
    if (!(logged && step==="heat")) return;
    const q = query(
      collection(db,"messages"),
      where("recipientId","==", userDoc.userId),
      where("personalChat","==", false),
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

  /* blocked list listener */
  useEffect(() => {
    if (!logged) return;
    const unsub = onSnapshot(
      query(collection(db, "blocks"), where("blockerId", "==", userDoc.userId)),
      snap => {
        setBlocked(new Set(snap.docs.map(d => d.data().blockedId)));
        const names = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.blockedName) names[data.blockedId] = data.blockedName;
        });
        setBlockedNames(names);
      }
    );
    return () => unsub();
  }, [logged, userDoc]);

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
        if(blocked.has(m.senderId)) return;
        if(
          (m.senderId===userDoc.userId && m.recipientId===partnerId && m.recipientName===partnerName) ||
          (m.senderId===partnerId && m.senderName===partnerName && m.recipientId===userDoc.userId)
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
  if(!userId||!email||!password||!pseudo) return pop("Fill all fields");
    const dupId = await getDocs(query(collection(db,"users"), where("userId","==",userId)));
    if(!dupId.empty) return pop("ID exists");
    const dupMail = await getDocs(query(collection(db,"users"), where("email","==",email)));
    if(!dupMail.empty) return pop("Email exists");
    await addDoc(collection(db,"users"),{userId,email,password,pseudoname:pseudo});
    await addDoc(collection(db,"users"),{userId,password,pseudoname:pseudo});
    pop("Account created"); setStep("login");
  };
  const manualLogin = async()=>{
    if(!userId||!password) return pop("Enter credentials");
    let snap = await getDocs(query(collection(db,"users"),where("userId","==",userId)));
    if(snap.empty && userId.includes("@"))
      snap = await getDocs(query(collection(db,"users"),where("email","==",userId)));
    if(snap.empty) return pop("ID/mail not found");
    const d = snap.docs[0].data();
    if(d.password!==password) return pop("Wrong password");
    const u = { uid:d.uid||null, userId:d.userId, pseudoname:d.pseudoname, email:d.email };
    setUserDoc(u);
    localStorage.setItem("waveUser", JSON.stringify(u));
     if(initialPartner) {
      setPartnerId(initialPartner);
      setPartnerName(initialPartner);
      setStep("waveChat");
      setPrefillUsed(true);
    } else {
      setStep("choose");
    }
  };
  const recoverPwd = async()=>{
    if(!email) return pop("Enter email");
    const snap = await getDocs(query(collection(db,"users"),where("email","==",email)));
    if(snap.empty) return pop("Email not found");
    const data = snap.docs[0].data();
    pop(`Password: ${data.password}`);
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
   if(!userId||!password||!pseudo) return pop("Fill all fields");
    const dup = await getDocs(query(collection(db,"users"),where("userId","==",userId)));
    if(!dup.empty) return pop("ID exists");
    await addDoc(collection(db,"users"), {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      userId,
      pseudoname: pseudo,
      password,
    });
     const u = { uid: auth.currentUser.uid, userId, pseudoname: pseudo, email: auth.currentUser.email };
    setUserDoc(u);
    localStorage.setItem("waveUser", JSON.stringify(u));
    // If initialPartner present, go straight to waveChat
    if(initialPartner) {
      setPartnerId(initialPartner);
      setPartnerName(initialPartner);
      setStep("waveChat");
      setPrefillUsed(true);
    } else {
      setStep("choose");
    }
  };

  /* ─── send DM ─── */
  const sendDm = async()=>{
    if(!partnerId.trim()||!text.trim())return;
    try {
      const otherSnap = await getDocs(
        query(
          collection(db, "contacts"),
          where("ownerId", "==", partnerId.trim()),
          where("partnerId", "==", userDoc.userId)
        )
      );
      const personal = !otherSnap.empty;
      await addDoc(collection(db,"messages"),{
        recipientId:partnerId.trim(),
        recipientName:partnerName,
        senderName:userDoc.pseudoname,
        senderId:userDoc.userId,
        personalChat:personal,
        text,
        read:false,
        createdAt:serverTimestamp(),
      });
      setText("");
      pop("Sent!");
    } catch {
      pop("Message failed");
    }
  };
  const sendAnonDm = async()=>{
    if(!partnerId.trim()||!text.trim())return;
    try {
      await addDoc(collection(db,"messages"),{
        recipientId : partnerId.trim(),
        senderName  : "Anonymous",
        senderId    : "",
        personalChat: false,
        text,
        createdAt   : serverTimestamp(),
      });
      setText("");
      pop("Sent!");
    } catch {
      pop("Message failed");
    }
  };
  /* ─── start Wave by ID ─── */
  const startWaveById = ()=>{
    const id = newWaveId.trim();
    if(!id) return;
    setNewWaveId("");
    setPartnerId(id);
    setPartnerName(id);
    setStep("waveChat");
  };

  /* ─── delete contact ─── */
  // const removePartner = async pid=>{
  //   if(!window.confirm("Remove contact for both users?"))return;
  //   await deleteMutual(userDoc.userId,pid);
  //   setContacts(c=>c.filter(x=>x.id!==pid));
  //   if(partnerId===pid){
  //     setPartnerId("");
  //     setDmMsgs([]);
  //     setStep("waveList");
  //   }
  // };

  /* ─── settings edit ─── */
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [muteSound, setMuteSound] = useState(
    localStorage.getItem('muteButtonSound') === 'true'
  );
  const toggleMuteSound = () => {
    const nv = !muteSound;
    setMuteSound(nv);
    localStorage.setItem('muteButtonSound', nv ? 'true' : 'false');
  };
  const openSettings = ()=>{
    setStep("settingsMenu");
  };

  const openProfile = ()=>{
    setNewId(userDoc.userId);
    setNewName(userDoc.pseudoname);
    setStep("settingsProfile");
  };

  const openBlockList = ()=>{
    setStep("settingsBlock");
  };

  const unblockUserId = async (blocker, blocked) => {
    const snap = await getDocs(
      query(
        collection(db, "blocks"),
        where("blockerId", "==", blocker),
        where("blockedId", "==", blocked)
      )
    );
     await Promise.all(
      snap.docs.map(async d => {
        const { wasContact, blockedName } = d.data();
        await deleteDoc(d.ref);
        if (wasContact) {
          await saveContact(blocker, blocked, blockedName).catch(() => {});
        }
      })
    );
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
  const onForgotEnter= e => e.key === "Enter" && recoverPwd();
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
        <Input ph="User ID or Email" v={userId} s={setUserId}/>
        <Input ph="Password" v={password} s={setPwd} pw onKey={onLoginEnter}/>
        <Btn onClick={manualLogin}>Login</Btn>
        <Btn className="mt-3 bg-purple-600 hover:bg-purple-700" onClick={googleSignIn}>
          Login&nbsp;with&nbsp;Google
        </Btn>
        <p className="link mt-3" onClick={()=>setStep("forgot")}>Forgot password?</p>
        <p className="link mt-3" onClick={()=>setStep("register")}>
          Register
        </p>
      </Panel>
    );

  /* register */
  if(step==="register")
    return (
      <Panel back={()=>setStep("login")} toast={toast}>
        <h2 className="title mb-4">Create account</h2>
        <Input ph="User ID" v={userId} s={setUserId}/>
        <Input ph="Email" v={email} s={setEmail}/>
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
        <Input ph="Password" v={password} s={setPwd} pw />
        <Input ph="Pseudoname" v={pseudo} s={setPseudo}/>
        <Btn onClick={saveGoogleInit}>Save</Btn>
      </Panel>
    );

    /* forgot password */
  if(step==="forgot")
    return(
      <Panel back={()=>setStep("login")} toast={toast}>
        <h2 className="title mb-4">Recover password</h2>
        <Input ph="Email" v={email} s={setEmail} onKey={onForgotEnter}/>
        <Btn onClick={recoverPwd}>Recover</Btn>
      </Panel>
    );
    
  /* choose role */
  if(step==="choose")
    return(
      <Panel>
        <div className="flex justify-between items-center mb-6 relative">
          <div className="flex items-center gap-3">
            <h2 className="title mb-0">{userDoc.pseudoname}</h2>
            <div className="relative">
              <button onClick={e=>{e.stopPropagation();setShareMenu(s=>!s);}} title="Share">🔗</button>
              {shareMenu && (
                <div className="absolute left-0 mt-1 bg-black/80 text-sm rounded shadow-lg z-10">
                  <button onClick={() => {shareProfileLink(userDoc.userId,pop);setShareMenu(false);}} className="block px-3 py-1 w-full text-left hover:bg-white/20">Link</button>
                  <button
                    onClick={() => {
                      setShareMenu(false);
                      setRandomStoryImg(storyImgs[Math.floor(Math.random() * storyImgs.length)]);
                      setShowStory(true);
                    }}
                    className="block px-3 py-1 w-full text-left hover:bg-white/20"
                  >Share</button>
                </div>
              )}
            </div>
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
        {showStory && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-20" onClick={()=>setShowStory(false)}>
            <div onClick={e=>e.stopPropagation()} className="bg-black p-4 rounded-lg">
              <StoryComposer
                backgroundSrc="/assets/space.gif"
                frameSrc="/assets/frame.png"
                catGifSrc={randomStoryImg}
                duserId={userDoc.userId}
                buttonClass="bg-pink-500 hover:bg-pink-600"
              />
              <button className="mt-3 text-white text-sm underline" onClick={()=>setShowStory(false)}>Close</button>
            </div>
          </div>
        )}
      </Panel>
    );

  /* settings menu */
  if(step==="settingsMenu")
    return(
      <Panel back={()=>setStep("choose")}>
        <h2 className="title mb-4">Settings</h2>
        <div className="space-y-3">
          <Btn onClick={openProfile}>Profile</Btn>
          <Btn onClick={openBlockList} className="bg-purple-600 hover:bg-purple-700">Blocked</Btn>
          <Btn onClick={toggleMuteSound} className="bg-purple-600/40 hover:bg-purple-700">
            {muteSound ? 'Sounds:OFF' : 'Sounds:ON'}
          </Btn>
        </div>
      </Panel>
    );

  /* settings profile */
  if(step==="settingsProfile")
    return(
      <Panel back={()=>setStep("settingsMenu")} toast={toast}>
        <h2 className="title mb-4">Edit profile</h2>
        <Input ph="New Wave-ID" v={newId} s={setNewId}/>
        <Input ph="New Pseudoname" v={newName} s={setNewName} onKey={e=>e.key==="Enter"&&saveSettings()}/>
        <Btn onClick={saveSettings}>Save changes</Btn>
      </Panel>
    );

    /* settings block list */
  if(step==="settingsBlock")
    return(
      <Panel back={()=>setStep("settingsMenu")} toast={toast}>
        <h2 className="title mb-4">Blocked users</h2>
        {blocked.size===0 ? (
          <p className="italic text-white/60">No blocked users</p>
        ) : (
          [...blocked].map(id => (
            <div key={id} className="flex justify-between items-center mb-2">
             <span>{blockedNames[id] || id}</span>
              <button onClick={()=>unblockUserId(userDoc.userId, id)} className="px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-sm">
                ✔ Unblock
              </button>
            </div>
          ))
        )}
      </Panel>
    );

  /* Heat */
  if(step==="heat")
    return (
      <Panel back={()=>setStep("choose")} toast={toast}>
        <h2 className="title ">Inbox for {userDoc.userId}</h2>
        <p className="text-xs text-white/60 ">Click name to add to Waves</p>
        <div className="h-72 overflow-y-auto space-y-3 pr-1 retro-scrollbar">
          {heatMsgs.filter(m=>!contacts.find(c=>c.id===m.senderId)&&!blocked.has(m.senderId)).length===0
            ? <p className="italic text-white/60">No messages</p>
            : heatMsgs
                .filter(m=>!contacts.find(c=>c.id===m.senderId)&&!blocked.has(m.senderId))
                .map(m=>(
                <div key={m.id} className="bg-white/10 p-3 rounded text-sm space-y-1 relative">
                  {m.senderId
                    ? (
                      <span
                        onClick={e=>{e.stopPropagation();setActiveHeat(m.id);}}
                        onMouseEnter={()=>setActiveHeat(m.id)}
                        className="font-semibold text-purple-300 cursor-pointer hover:text-yellow-200 hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]">
                        {m.senderName}
                      </span>
                    )
                    : (
                      <span
                        onClick={e=>{e.stopPropagation();setActiveHeat(m.id);}}
                        onMouseEnter={()=>setActiveHeat(m.id)}
                        className="font-semibold text-red-300 cursor-pointer">
                        {m.senderName}
                      </span>
                    )
                  }
                  <span>: {m.text}</span>
                  {activeHeat===m.id && (
                    <div className="absolute top-full mt-1 left-0 flex gap-2 z-10">
                      {m.senderId && (
                        <button
                          onClick={e=>{e.stopPropagation();saveMutual(userDoc.userId,m.senderId,userDoc.pseudoname,m.senderName);setActiveHeat(null);}}
                          className="px-2 py-1 text-xs bg-green-600 rounded hover:bg-green-700"
                        >Add</button>
                      )}
                      <button
                        onClick={e=>{e.stopPropagation();setStoryMessage(m.text);setShowHeatStory(true);setActiveHeat(null);}}
                        className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
                      >Share</button>
                      <button
                         onClick={e=>{e.stopPropagation();blockUserId(userDoc.userId,m.senderId||'anon', m.senderName);setActiveHeat(null);}}
                        className="px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
                      >Block</button>
                    </div>
                  )}
                </div>
              ))
          }
          <div ref={heatEnd}/>
        </div>
        {showHeatStory && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-20" onClick={()=>setShowHeatStory(false)}>
            <div onClick={e=>e.stopPropagation()} className="bg-black p-4 rounded-lg">
              <StoryComposer
                backgroundSrc="/assets/space.gif"
                frameSrc="/assets/frame.png"
                catGifSrc="/assets/cat1.gif"
                message={storyMessage}
                duserId={userDoc.userId}
                buttonClass="bg-pink-500 hover:bg-pink-600"
              />
              <button className="mt-3 text-white text-sm underline" onClick={()=>setShowHeatStory(false)}>Close</button>
            </div>
          </div>
        )}
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
         {blocked.has(partnerId) && (
          <p className="italic mb-2">User blocked.</p>
        )}
        <div className="h-56 overflow-y-auto space-y-2 pr-1 mt-2 retro-scrollbar">
          {dmMsgs.map((m,i)=>{
            const prev = dmMsgs[i-1];
            const extraGap = i>0 && prev.senderId!==m.senderId ? 'mt-3' : '';
            return (
              <div key={m.id}
                   className={`max-w-xs px-3 py-2 rounded-lg text-sm shadow ${extraGap} ${m.senderId===userDoc.userId ? "bg-pink-500 self-end" : "bg-white/10"}`}
              >
                {m.text}
              </div>
            );
          })}
          <div ref={dmEnd}/>
        </div>
        <Textarea v={text} s={setText} onKeyDown={onMsgKey}/>
        <div className="flex gap-2">
          <Btn onClick={sendDm} className="flex-1">Send</Btn>
          <Btn onClick={sendAnonDm} className="flex-1 bg-white/20 hover:bg-white/30 text-black">Anonymous</Btn>
        </div>
        {!blocked.has(partnerId) && (
          <button
            onClick={()=>blockUserId(userDoc.userId, partnerId, partnerName)}
            className="mt-2 w-full text-sm text-red-300 hover:text-red-400"
          >
            Block
          </button>
        )}
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

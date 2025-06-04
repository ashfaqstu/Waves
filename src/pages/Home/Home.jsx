// src/pages/Home/Home.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import WavyTitle   from "../../components/WavyTitle";
import ChatBox     from "../../components/ChatBox";
import LyricsPanel from "../../components/LyricsPanel";
import { lyrics }  from "../../data/lyrics";
import { db }      from "../../firebase";  

/* ---------- static assets from /public ----------------------------- */
const spaceGif      = "/assets/space.gif";
const pixelArtImage = "/assets/cat.png";
const cat1          = "/assets/cat1.gif";
const cat2          = "/assets/cat2.gif";
const frameOverlay  = "/assets/frame.png";
const music         = "/assets/music.mp3";

const frameImgs = [
  "/assets/frames/1.png",  "/assets/frames/2.png",  "/assets/frames/3.png",
  "/assets/frames/4.png",  "/assets/frames/5.png",  "/assets/frames/6.png",
  "/assets/frames/7.png",  "/assets/frames/8.png",  "/assets/frames/square_9.png",
  "/assets/frames/square_10.png", "/assets/frames/square_11.png",
  "/assets/frames/square_12.png", "/assets/frames/square_13.png",
];

/* timeline helper ≈ 4 s per picture */
const frames = frameImgs.map((img, i) => ({
  img,
  start: 30 + i * 4,
  end  : 34 + i * 4,
}));

export default function Home() {
  const [lineIdx,   setLineIdx]   = useState(0);
  const [frameImg,  setFrameImg]  = useState(null);
  const [fallback,  setFallback]  = useState(pixelArtImage);
  const [playing,   setPlaying]   = useState(false);

  // Whether the chat panel is open
  const [chatOpen,  setChatOpen]  = useState(false);

  // “anon” → show anonymous bar; “login” → mount ChatBox at login
  const [entryChoice, setEntryChoice] = useState(null);

  // Fields for anonymous bar
  const [anonId, setAnonId]       = useState("");
  const [anonText, setAnonText]   = useState("");
  const [anonToast, setAnonToast] = useState("");

  const audioRef = useRef(null);

  /************************************************************************
   *  1) Read `?waveId=` from URL so that:
   *     • If present, anonId is prefilled.
   *     • We auto‐open the chat panel and show the two choices.
   *     • Pass it as initialPartner to ChatBox if “Login” is chosen.
   ************************************************************************/
  const [prefilledWaveId, setPrefilledWaveId] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wid = params.get("waveId");
    if (wid) {
      const trimmed = wid.trim();
      setPrefilledWaveId(trimmed);
      setAnonId(trimmed);
      // Immediately open the chat panel and show choices
      setChatOpen(true);
      setEntryChoice(null);
    }
  }, []);

  /* rotate fallback cat gifs every 4 s (when no frame) */
  useEffect(() => {
    if (frameImg) return;
    const pics = [cat1, cat2, pixelArtImage];
    const pick = () => setFallback(pics[Math.floor(Math.random() * pics.length)]);
    pick();
    const id = setInterval(pick, 4000);
    return () => clearInterval(id);
  }, [frameImg]);

  /* main audio sync */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      const t = a.currentTime;
      /* lyric index */
      const li = lyrics.findIndex((l, i) =>
        t >= l.time && (i === lyrics.length - 1 || t < lyrics[i + 1].time)
      );
      setLineIdx(li === -1 ? 0 : li);

      /* frame */
      const fr = frames.find(f => t >= f.start && t < f.end);
      setFrameImg(fr ? fr.img : null);
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play",  () => setPlaying(true));
    a.addEventListener("pause", () => setPlaying(false));
    a.addEventListener("ended", () => { a.currentTime = 0; a.play(); });

    return () => a.removeEventListener("timeupdate", onTime);
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    a[playing ? "pause" : "play"]();
  };

  /************************************************************************
   *  2) Anonymous send: write a Firestore document with senderId=""
   *     After sending, we “Cancel” automatically and clear the URL.
   ************************************************************************/
  const sendAnon = async () => {
    if (!anonId.trim() || !anonText.trim()) {
      setAnonToast("Fill both fields");
      setTimeout(() => setAnonToast(""), 2000);
      return;
    }
    try {
      await addDoc(collection(db, "messages"), {
        recipientId: anonId.trim(),
        senderName : "Anonymous",
        senderId   : "",
        personalChat: false,
        text       : anonText,
        createdAt  : serverTimestamp(),
      });
      setAnonToast("Sent!");
      setAnonText("");
      setTimeout(() => {
        // Remove ?waveId from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Reset everything
        setPrefilledWaveId(null);
        setAnonId("");
        setEntryChoice(null);
        setChatOpen(false);
      }, 2000);
    } catch {
      setAnonToast("Send failed");
      setTimeout(() => setAnonToast(""), 2000);
    }
  };

  /************************************************************************
   *  3) “Share” button (only when logged in) will share to Instagram Story.
   ************************************************************************/
  const igshare = () => {
    const user = localStorage.getItem("waveUser");
    if (!user) return;
    const { userId: me } = JSON.parse(user);

    const bg = encodeURIComponent(spaceGif);
    const sticker1 = encodeURIComponent(frameOverlay);
    const sticker2 = encodeURIComponent(cat1);
    const storyLink = encodeURIComponent(window.location.origin + `/?waveId=${me}`);

    const igUri = 
      `instagram-stories://share?` +
      `backgroundImage=${bg}` +
      `&stickerImage=${sticker1}` +
      `&stickerImage=${sticker2}` +
      `&attributionURL=${storyLink}`;

    window.location.href = igUri;

    // Fallback: copy the link to clipboard for desktop
    setTimeout(() => {
      navigator.clipboard.writeText(window.location.origin + `/?waveId=${me}`)
        .then(() => alert("Link copied to clipboard! Share it as a Story."))
        .catch(() => {});
    }, 1000);
  };

  /************************************************************************
   *  4) “Cancel all” handler—used under both sub‐panels (“Anonymous” & “Login”):
   *     • Remove ?waveId from URL
   *     • Reset state
   *     • Close the chat panel
   ************************************************************************/
  const cancelAll = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setPrefilledWaveId(null);
    setAnonId("");
    setEntryChoice(null);
    setChatOpen(false);
  };

  return (
    <>
      {/* background */}
      <img
        src={spaceGif}
        className="fixed inset-0 -z-20 h-full w-full object-cover"
        alt=""
      />

      <main className="relative flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 px-4 py-8 min-h-screen text-white">

        {/* frame block */}
        <div className="relative w-full sm:w-1/2 max-w-sm">
          <img
            src={frameImg || fallback}
            className="w-full object-contain"
            style={{ imageRendering: "pixelated" }}
            alt=""
          />
          <img
            src={frameOverlay}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ imageRendering: "pixelated" }}
            alt=""
          />
        </div>

        {/* lyrics + chat column */}
        <div className="w-full sm:w-1/2 max-w-sm flex flex-col items-center sm:items-start">
          <LyricsPanel
            playing={playing}
            lineIdx={lineIdx}
            toggle={togglePlay}
          />

          {/* ─── “Share” button (only if logged in) ─── */}
          {localStorage.getItem("waveUser") && (
            <button
              onClick={igshare}
              className="mt-4 px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 transition shadow-lg"
            >
              Share as Story
            </button>
          )}

          {/* ─── “Open Chat” / “Close Chat” toggle ─── */}
          {!prefilledWaveId && (
            <button
              onClick={() => {
                setEntryChoice(null);
                setChatOpen(v => !v);
              }}
              className="mt-4 sm:mt-6 px-6 py-2 rounded-full bg-pink-500 hover:bg-pink-600 transition shadow-lg"
            >
              {chatOpen ? "Close Chat" : "Open Chat"}
            </button>
          )}

          {/* ─── Chat pane ─── */}
          {chatOpen && (
            <div className="w-full mt-4 relative">
              {/* ───── Step 1: Two small buttons “Anonymous” / “Login” ───── */}
              {!entryChoice && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2
                                rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-3 flex gap-4">
                  <button
                    onClick={() => setEntryChoice("anon")}
                    className="px-4 py-1 bg-white/20 backdrop-blur-sm text-black rounded-md hover:bg-white/30 transition"
                  >
                    Anonymous
                  </button>
                  <button
                    onClick={() => setEntryChoice("login")}
                    className="px-4 py-1 bg-white/20 backdrop-blur-sm text-black rounded-md hover:bg-white/30 transition"
                  >
                    Login
                  </button>
                </div>
              )}

              {/* ───── Step 2a: “Anonymous” chosen → show form ───── */}
              {entryChoice === "anon" && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg shadow-md relative">
                  {/* An “X” or small text “Cancel” underneath */}
                  <div className="mb-3">
                    {anonToast && (
                      <p className="text-green-300 text-sm">{anonToast}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Recipient ID"
                    value={anonId}
                    onChange={e => setAnonId(e.target.value)}
                    className="w-full p-2 mb-3 rounded text-black backdrop-blur-sm bg-white/30"
                  />
                  <textarea
                    rows={3}
                    placeholder="Message"
                    value={anonText}
                    onChange={e => setAnonText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendAnon();
                      }
                    }}
                    className="w-full p-2 mb-3 rounded resize-none text-black backdrop-blur-sm bg-white/30"
                  />
                  <button
                    onClick={sendAnon}
                    className="w-full py-2 bg-white/20 backdrop-blur-sm text-black rounded-lg hover:bg-white/30 transition"
                  >
                    Send
                  </button>
                  <button
                    onClick={cancelAll}
                    className="mt-3 w-full text-sm text-white/80 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* ───── Step 2b: “Login” chosen → mount ChatBox ───── */}
              {entryChoice === "login" && (
                <div className="mt-4 relative">
                  <ChatBox
                    initialStep="login"
                    initialPartner={prefilledWaveId}
                  />
                  <button
                    onClick={cancelAll}
                    className="mt-3 w-full text-sm text-white/80 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* animated site title */}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <WavyTitle />
        </div>

        <audio ref={audioRef} src={music} />
      </main>
    </>
  );
}

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

  // "chat" → ChatBox, "anon" → anonymous form
  const [chatMode, setChatMode] = useState("chat");

  // Fields + state for anonymous form
  const [anonId, setAnonId]       = useState("");
  const [anonText, setAnonText]   = useState("");
  const [anonToast, setAnonToast] = useState("");

  const audioRef = useRef(null);

  /************************************************************************
   *  1) Read `?waveId=` from URL:
   *     - Prefill anonId
   *     - Auto-open chat panel
   *     - Keep the waveId in prefilledWaveId to pass to ChatBox
   ************************************************************************/
  const [prefilledWaveId, setPrefilledWaveId] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wid = params.get("waveId");
    if (wid) {
      const trimmed = wid.trim();
      setPrefilledWaveId(trimmed);
      setAnonId(trimmed);
      // Open the chat panel immediately
      setChatMode("chat");
      setChatOpen(true);
    }
  }, []);

  /* rotate fallback cat GIFs every 4 s (when no frame) */
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
   *  2) Anonymous send: write to Firestore with senderId=""
   *     After sending, clear ?waveId and reset UI
   ************************************************************************/
  const sendAnon = async () => {
    if (!anonId.trim() || !anonText.trim()) {
      setAnonToast("Fill both fields");
      setTimeout(() => setAnonToast(""), 2000);
      return;
    }
    try {
      await addDoc(collection(db, "messages"), {
        recipientId : anonId.trim(),
        senderName  : "Anonymous",
        senderId    : "",
        personalChat: false,
        text        : anonText,
        createdAt   : serverTimestamp(),
      });
      setAnonToast("Sent!");
      setAnonText("");
      setTimeout(() => {
        // Remove ?waveId from URL and reset state
        window.history.replaceState({}, document.title, window.location.pathname);
        setPrefilledWaveId(null);
        setAnonId("");
        setChatMode("chat");
        setChatOpen(false);
      }, 2000);
    } catch {
      setAnonToast("Send failed");
      setTimeout(() => setAnonToast(""), 2000);
    }
  };

  
  /************************************************************************
   *  4) “Cancel” handler → remove ?waveId and reset everything
   ************************************************************************/
  const cancelAll = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setPrefilledWaveId(null);
    setAnonId("");
    setChatMode("chat");
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

        {/* ─── Left column: rotating frames / fallback ─── */}
        <div className="relative w-full sm:w-1/2 max-w-xs sm:max-w-sm aspect-square overflow-hidden">
  {/* Scaled and centered image */}
  <img
    src={frameImg || fallback}
    className="absolute top-1/2 left-1/2 w-[92%] h-[92%] object-contain translate-x-[-50%] translate-y-[-50%]"
    style={{ imageRendering: "pixelated" }}
    alt=""
  />

  {/* Overlay frame (square, fixed) */}
  <img
    src={frameOverlay}
    className="absolute inset-0 w-full h-full pointer-events-none"
    style={{ imageRendering: "pixelated" }}
    alt=""
  />
</div>



        {/* ─── Right column: lyrics, share button, chat ─── */}
        <div className="w-full sm:w-1/2 max-w-sm flex flex-col items-center sm:items-start">
          <LyricsPanel
            playing={playing}
            lineIdx={lineIdx}
            toggle={togglePlay}
          />

          {/* Share buttons removed */}

           {/* ─── "Open Chat" toggle (only if no ?waveId) ─── */}
          {!prefilledWaveId && (
            <div className="relative w-full">
              {chatOpen && (
                <button
                  onClick={cancelAll}
                  className="absolute top-2 right-2 text-white text-xl hover:text-pink-300 transition"
                  title="Close Chat"
                >
                  ✖
                </button>
              )}

              {!chatOpen && (
                <button
                  onClick={() => {
                    setChatMode("chat");
                    setChatOpen(true);
                  }}
                  className="mt-4 sm:mt-6 px-6 py-2 rounded-full bg-pink-500 hover:bg-pink-600 transition shadow-lg"
                >
                  Open Chat
                </button>
              )}
            </div>
          )}



          {/* ─── Chat Panel ─── */}
          {chatOpen && (
            <div className="w-full mt-4 relative">
              <button
                onClick={cancelAll}
                className="absolute top-2 right-2 text-white text-xl hover:text-pink-300 transition"
                title="Close"
              >
                ✖
              </button>

              {chatMode === "anon" ? (
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-lg shadow-md">
                  <div className="mb-3">
                    {anonToast && (
                      <p className="text-green-300 text-sm">{anonToast}</p>
                    )}
                  </div>
                  <div className="flex items-center mb-3">
                    <button
                      onClick={() => setChatMode("chat")}
                      className="px-2 py-1 mr-2 bg-white/30 backdrop-blur-sm text-black rounded"
                    >
                      ←
                    </button>
                    <input
                      type="text"
                      placeholder="Recipient ID"
                      value={anonId}
                      onChange={e => setAnonId(e.target.value)}
                      className="flex-1 p-2 rounded text-black backdrop-blur-sm bg-white/30"
                    />
                  </div>
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
                    className="w-full py-2 bg-white/30 backdrop-blur-sm text-black rounded-lg hover:bg-white/40 transition"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="mt-4 relative">
                  <ChatBox
                    initialStep="heat"
                    initialPartner={prefilledWaveId}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animated site title */}
        <div className="fixed left-1/2 -translate-x-1/2 top-3 sm:top-auto sm:bottom-3 pointer-events-none">
          <WavyTitle />
        </div>

        <audio ref={audioRef} src={music} />
      </main>
    </>
  );
}



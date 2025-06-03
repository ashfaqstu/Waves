import React, { useState, useEffect, useRef } from "react";
import ChatBox   from "../../components/ChatBox";
import WavyTitle from "../../components/WavyTitle";

/* ---------------- static files served from /public ---------------- */
const spaceGif      = "/assets/space.gif";
const pixelArtImage = "/assets/cat.png";
const cat1          = "/assets/cat1.gif";
const cat2          = "/assets/cat2.gif";
const frameOverlay  = "/assets/frame.png";
const music         = "/assets/music.mp3";

const frameImgs = [
  "/assets/frames/1.png",
  "/assets/frames/2.png",
  "/assets/frames/3.png",
  "/assets/frames/4.png",
  "/assets/frames/5.png",
  "/assets/frames/6.png",
  "/assets/frames/7.png",
  "/assets/frames/8.png",
  "/assets/frames/square_9.png",
  "/assets/frames/square_10.png",
  "/assets/frames/square_11.png",
  "/assets/frames/square_12.png",
  "/assets/frames/square_13.png",
];

/* ---------- timeline helper (≈ 4 s per frame) --------------------- */
const frames = frameImgs.map((img, i) => ({
  img,
  start: 30 + i * 4,
  end  : 34 + i * 4,
}));

/* ---------- lyrics (trimmed for brevity – keep yours) ------------- */
const lyrics = [
  { time: 0,   text: "(pop music)" },
  { time: 30,  text: "Sometimes all I think about is you" },
  { time: 33,  text: "Late nights in the middle of June" },
  { time: 36,  text: "Heat waves been fakin' me out" },
  { time: 39,  text: "Can't make you happier now" },
  /* … keep rest …                                                     */
  { time: 188, text: "(pop music)" },
];

/* ---------- tsp glow on hover for every letter -------------------- */
const letterGlow = `
.letter{transition:text-shadow .2s}
.letter:hover{text-shadow:0 0 6px #fff,0 0 12px #fff7aa;cursor:pointer}
`;

export default function Home() {
  const [lineIdx, setLineIdx]     = useState(0);
  const [frameImg, setFrameImg]   = useState(null);
  const [fallback, setFallback]   = useState(pixelArtImage);
  const [playing, setPlaying]     = useState(false);
  const [chatOpen, setChatOpen]   = useState(false);
  const audioRef                  = useRef(null);

  /* ---------- rotate fallback cat gifs every 4 s ------------------- */
  useEffect(() => {
    if (frameImg) return;
    const pics = [cat1, cat2, pixelArtImage];
    const swap = () => setFallback(pics[Math.floor(Math.random() * pics.length)]);
    swap();
    const id = setInterval(swap, 4000);
    return () => clearInterval(id);
  }, [frameImg]);

  /* ---------- audio sync (lyrics + frame) -------------------------- */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      const t = a.currentTime;

      const li = lyrics.findIndex((l, idx) =>
        t >= l.time && (idx === lyrics.length - 1 || t < lyrics[idx + 1].time)
      );
      setLineIdx(li === -1 ? 0 : li);

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

  const renderLetters = txt =>
    txt.split("").map((c, i) => (
      <span key={i} className="letter">{c}</span>
    ));

  /* ---------- UI --------------------------------------------------- */
  return (
    <>
      <style>{letterGlow}</style>

      {/* background */}
      <img
        src={spaceGif}
        className="fixed inset-0 -z-20 h-full w-full object-cover"
        alt=""
        aria-hidden
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

        {/* lyric + chat column */}
        <div className="w-full sm:w-1/2 max-w-sm flex flex-col items-center sm:items-start">
          {/* lyrics */}
          <div
            onClick={togglePlay}
            className="w-full h-48 sm:h-56 overflow-y-auto rounded-lg bg-white/10 backdrop-blur-md p-4 text-center sm:text-left font-mono text-lg sm:text-xl leading-snug cursor-pointer"
          >
            {playing ? renderLetters(lyrics[lineIdx].text) : lyrics[lineIdx].text}
            <p className="mt-3 text-xs text-white/60 italic">
              (Click lyrics to {playing ? "pause" : "play"})
            </p>
          </div>

          {/* toggle button */}
          <button
            onClick={() => setChatOpen(v => !v)}
            className="mt-4 sm:mt-6 px-6 py-2 rounded-full bg-pink-500 hover:bg-pink-600 transition shadow-lg"
          >
            {chatOpen ? "Close Chat" : "Open Chat"}
          </button>

          {/* chat panel (embedded) */}
          {chatOpen && (
            <div className="w-full mt-4">
              <ChatBox />
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

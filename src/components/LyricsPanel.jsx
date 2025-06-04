import React from "react";
import { lyrics } from "../data/lyrics";

/* small glow-on-hover css (isolated to this component) */
const glowCSS = `
.lyric-letter{
  transition:text-shadow .2s;
}
.lyric-letter:hover{
  text-shadow:0 0 6px #fff,0 0 12px #fff7aa;
  cursor:pointer;
}
`;

function renderLetters(text) {
  return text.split("").map((c, i) => (
    <span key={i} className="lyric-letter">{c}</span>
  ));
}

/**
 * Props
 * ─────
 * playing   boolean   – is the audio playing?
 * lineIdx   number    – current index into lyrics[]
 * toggle    function  – click handler (play / pause)
 */
export default function LyricsPanel({ playing, lineIdx, toggle }) {
  const line = lyrics[lineIdx]?.text || "";

  return (
    <>
      <style>{glowCSS}</style>

      <div
        onClick={toggle}
        className="w-full max-h-65 overflow-y-auto rounded-lg
                   bg-white/10 backdrop-blur-md p-4
                   text-center sm:text-left font-mono
                   text-lg sm:text-xl leading-snug cursor-pointer
                   padding-6 shadow-lg mb-8
                   hover:bg-white/20 transition-colors"
      >
        {playing ? renderLetters(line) : line}

        <p className="mt-2 text-xs text-white/60 italic">
          (Click lyrics to {playing ? "pause" : "play"})
        </p>
      </div>
      <div className="h-2"></div>
      
    </>
  );
}

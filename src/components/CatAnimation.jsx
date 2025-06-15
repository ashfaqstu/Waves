import React, { useState, useEffect } from "react";

// Frame counts for each animation folder
const CAT_FRAMES = { 1: 10, 2: 8, 3: 5, 4: 8, 5: 5, 6: 15, 7: 8 };

/**
 * CatAnimation
 * -------------
 * Props:
 *   trigger  any     – change value to restart animation
 *   speed    number  – milliseconds between frames
 */
export default function CatAnimation({ trigger, speed = 100 }) {
  const [frames, setFrames] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (trigger === null || trigger === undefined) return;
    const folder = Math.floor(Math.random() * 7) + 1;
    const count = CAT_FRAMES[folder];
    const fr = Array.from({ length: count }, (_, i) => `/assets/cat/${folder}/${i}.png`);
    setFrames(fr);
    setIdx(0);
  }, [trigger]);

  useEffect(() => {
    if (!frames.length) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        setFrames([]);
        clearInterval(id);
      } else {
        setIdx(i);
      }
    }, speed);
    return () => clearInterval(id);
  }, [frames, speed]);

  if (!frames.length) return null;

  return (
    <img
      src={frames[idx]}
      alt="cat animation"
      className="absolute left-1/2 -translate-x-1/2"
      /* Adjust width/height here to control size */
      style={{ width: "160px", height: "160px" }}
    />
  );
}
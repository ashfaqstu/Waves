import { useRef, useState } from "react";
import CatAnimation from "./CatAnimation";

// Control the speed of the cat animation (ms per frame)
export const CAT_ANIM_SPEED = 100;
export default function WavyTitle() {
  const [animTrigger, setAnimTrigger] = useState(0);
  const audioRef = useRef(null);

  const onClick = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/assets/cat/meo.mp3");
    }
    const a = audioRef.current;
    a.currentTime = 0;
    a.play();
    // Change trigger value to restart animation
    setAnimTrigger(t => t + 1);
  };
  return (
     <div className="select-none pointer-events-auto relative" onClick={onClick}>
      <h1 className="text-6xl font-bold font-mono text-purple-400 whitespace-nowrap cursor-pointer">
        {"WAVES".split("").map((letter, idx) => (
          <span
            key={idx}
            className="inline-block animate-wave"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
            {letter}
          </span>
        ))}
      </h1>
      {/* Positioning: on desktop the animation sits above the text,
          on mobile it appears below. Adjust `top`/`bottom` and
          width/height in CatAnimation to change size and placement. */}
      <div className="sm:bottom-full sm:mb-2 top-full mt-2 absolute left-1/2 -translate-x-1/2">
        <CatAnimation trigger={animTrigger} speed={CAT_ANIM_SPEED} />
      </div>
    </div>
  );
}

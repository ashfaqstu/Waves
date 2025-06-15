import { useState, useEffect } from "react";

const CAT_FRAMES   = { 1:10, 2:8, 3:5, 4:8, 5:5, 6:15, 7:8 };
const LOOP_FOLDERS = [1,2,4,7,3,5];

export default function CatAnimation({ trigger, speed = 500, duration = 3000 }) {
  const [frames, setFrames]   = useState([]);
  const [idx,    setIdx]      = useState(0);
  const [playing,setPlaying]  = useState(false);
  const [loop,   setLoop]     = useState(false);

  /* pick a folder & preload frames whenever trigger changes */
  useEffect(() => {
    if (trigger==null) return;
    const folder = Math.floor(Math.random()*7)+1;
    const fr     = Array.from({length:CAT_FRAMES[folder]},
                  (_,i)=>`/assets/cat/${folder}/${i}.png`);
    setFrames(fr);
    setIdx(0);
    setLoop(LOOP_FOLDERS.includes(folder));
    setPlaying(true);
    const stop = setTimeout(()=>setPlaying(false), duration);
    return ()=>clearTimeout(stop);
  }, [trigger, duration]);

  /* frame-stepper */
  useEffect(() => {
    if(!frames.length||!playing) return;
    let i = 0;
    const id = setInterval(()=>{
      i++;
      if(!loop && i>=frames.length){ setPlaying(false); clearInterval(id); }
      else setIdx(i % frames.length);
    }, speed);
    return ()=>clearInterval(id);
  }, [frames, speed, playing, loop]);

  if(!frames.length||!playing) return null;

return (
    <div
        /* mobile = centered vertically; desktop = bottom of screen */
        className="
            w-full flex justify-center pointer-events-none z-[9999]
            fixed top-1/2 -translate-y-1/2
            sm:fixed sm:top-auto sm:bottom-0 sm:translate+y+100
        "
    >
        <img
            src={frames[idx]}
            alt="cat animation"
            style={{
                transform: "scale(5)",
                imageRendering: "pixelated"
            }}
        />
    </div>
);
}

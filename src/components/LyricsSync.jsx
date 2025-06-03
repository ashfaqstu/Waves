import React, { useState, useEffect, useRef } from "react";

const lyrics = [
  { time: 0.01, text: "Sometimes all I think about is you" },
  { time: 5.09, text: "Late nights in the middle of June" },
  { time: 10.30, text: "Heat waves been fakin' me out" },
  { time: 14.95, text: "Can't make you happier now" },
  { time: 18.84, text: "Sometimes all I think about is you" },
  { time: 22.97, text: "Late nights in the middle of June" },
  { time: 27.29, text: "Heat waves been fakin' me out" },
  { time: 31.85, text: "Can't make you happier now" },
  { time: 36.04, text: "Usually I put somethin' on TV" },
  { time: 39.81, text: "So you don't feel like you're alone" },
  { time: 43.59, text: "Usually I listen to the music" },
  { time: 47.03, text: "So I can't feel you on my phone" },
  { time: 51.39, text: "Late nights when my dreams expose" },
  { time: 54.76, text: "Sometimes I think that you love me" },
  { time: 58.03, text: "But sometimes I think that you don't" },
  { time: 62.41, text: "Sometimes I think that you're happy" },
  { time: 65.91, text: "But sometimes I think that you won't" },
  { time: 70.01, text: "Thinkin' 'bout the way you look tonight" },
  { time: 74.36, text: "Through the bathroom window" },
  { time: 76.59, text: "Tryna call your name through the phone" },
  { time: 79.41, text: "Can't find the words to tell you" },
  { time: 81.34, text: "Only one thing's on my mind" },
  { time: 84.89, text: "I just wanna know if you're fine" },
  { time: 88.12, text: "Sometimes all I think about is you" },
  { time: 92.54, text: "Late nights in the middle of June" },
  { time: 97.68, text: "Heat waves been fakin' me out" },
  { time: 102.13, text: "Can't make you happier now" },
  { time: 106.56, text: "Sometimes all I think about is you" },
  { time: 111.15, text: "Late nights in the middle of June" },
  { time: 115.60, text: "Heat waves been fakin' me out" },
  { time: 120.23, text: "Can't make you happier now" },
  { time: 124.51, text: "Usually I put somethin' on TV" },
  { time: 128.21, text: "So you don't feel like you're alone" },
  { time: 132.02, text: "Usually I listen to the music" },
  { time: 135.45, text: "So I can't feel you on my phone" },
  { time: 139.70, text: "Late nights when my dreams expose" },
  { time: 143.15, text: "Sometimes I think that you love me" },
  { time: 146.74, text: "But sometimes I think that you don't" },
  { time: 150.85, text: "Sometimes I think that you're happy" },
  { time: 154.17, text: "But sometimes I think that you won't" },
  { time: 158.08, text: "Thinkin' 'bout the way you look tonight" },
  { time: 162.21, text: "Through the bathroom window" },
  { time: 164.56, text: "Tryna call your name through the phone" },
  { time: 167.24, text: "Can't find the words to tell you" },
  { time: 169.15, text: "Only one thing's on my mind" },
  { time: 172.68, text: "I just wanna know if you're fine" },
  { time: 175.90, text: "Sometimes all I think about is you" },
  { time: 180.21, text: "Late nights in the middle of June" },
  { time: 185.05, text: "Heat waves been fakin' me out" },
  { time: 189.51, text: "Can't make you happier now" },
  { time: 193.85, text: "Sometimes all I think about is you" },
  { time: 198.38, text: "Late nights in the middle of June" },
  { time: 202.89, text: "Heat waves been fakin' me out" },
  { time: 207.31, text: "Can't make you happier now" },
];

export default function LyricsSync() {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate() {
      const currentTime = video.currentTime;
      let index = lyrics.length - 1;
      for (let i = 0; i < lyrics.length; i++) {
        if (
          currentTime >= lyrics[i].time &&
          (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)
        ) {
          index = i;
          break;
        }
      }
      setCurrentLineIndex(index);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-900 via-purple-700 to-purple-900 min-h-screen text-white font-mono">
      <video
        ref={videoRef}
        src="/path/to/your/song-or-video.mp4" // Replace with your actual media source
        controls
        className="w-full max-w-lg rounded shadow-lg"
      />
      <div className="mt-8 w-full max-w-lg bg-purple-800/80 rounded-lg p-6 text-center">
        {lyrics.map((line, i) => (
          <p
            key={i}
            className={`transition-opacity duration-500 ${
              i === currentLineIndex
                ? "opacity-100 text-yellow-300 font-bold text-xl"
                : "opacity-30 text-base"
            }`}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

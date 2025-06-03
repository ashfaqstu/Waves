import React, { useState, useEffect, useRef } from "react";
import spaceGif from "../../assets/space.gif";
import pixelArtImage from "../../assets/cat.png";
import cat1 from "../../assets/cat1.gif";
import cat2 from "../../assets/cat2.gif";
import frame from "../../assets/frame.png";
import music from "../../assets/music.mp3";
import ChatBox from "../../components/ChatBox";

import frame1Img from "../../assets/frames/1.png";
import frame2Img from "../../assets/frames/2.png";
import frame3Img from "../../assets/frames/3.png";
import frame4Img from "../../assets/frames/4.png";
import frame5Img from "../../assets/frames/5.png";
import frame6Img from "../../assets/frames/6.png";
import frame7Img from "../../assets/frames/7.png";
import frame8Img from "../../assets/frames/8.png";
import frame9Img from "../../assets/frames/square_9.png";
import frame10Img from "../../assets/frames/square_10.png";
import frame11Img from "../../assets/frames/square_11.png";
import frame12Img from "../../assets/frames/square_12.png";
import frame13Img from "../../assets/frames/square_13.png";
import WavyTitle from "../../components/WavyTitle";

const frames = [
  { start: 30, end: 34, img: frame1Img },
  { start: 34, end: 38, img: frame2Img },
  { start: 38, end: 42, img: frame3Img },
  { start: 42, end: 46, img: frame4Img },
  { start: 46, end: 50, img: frame5Img },
  { start: 50, end: 54, img: frame6Img },
  { start: 54, end: 58, img: frame7Img },
  { start: 58, end: 62, img: frame8Img },
  { start: 62, end: 66, img: frame9Img },
  { start: 66, end: 70, img: frame10Img },
  { start: 70, end: 74, img: frame11Img },
  { start: 74, end: 78, img: frame12Img },
  { start: 78, end: 82, img: frame13Img },
];

const lyrics = [
  { time: 0, text: "(pop music)" },
  { time: 30, text: "Sometimes all I think about is you" },
  { time: 33, text: "Late nights in the middle of June" },
  { time: 36, text: "Heat waves been fakin' me out" },
  { time: 39, text: "Can't make you happier now" },
  { time: 42, text: "Sometimes all I think about is you" },
  { time: 45, text: "Late nights in the middle of June" },
  { time: 48, text: "Heat waves been fakin' me out" },
  { time: 51, text: "Can't make you happier now" },
  { time: 54, text: "Usually, I put them on TV" },
  { time: 57, text: "So we never think" },
  { time: 59, text: "About you and me" },
  { time: 60, text: "But today I see our reflections" },
  { time: 63, text: "Clearly in Hollywood" },
  { time: 64, text: "Playing on the screen" },
  { time: 66, text: "You just need a better life than me" },
  { time: 69, text: "You need someone I can never be" },
  { time: 72, text: "Think better all across the road" },
  { time: 75, text: "It's gone when the night is calm" },
  { time: 78, text: "But sometimes all I think about is you" },
  { time: 81, text: "Late nights in the middle of June" },
  { time: 84, text: "Heat waves been fakin' me out" },
  { time: 87, text: "Can't make you happier now" },
  { time: 90, text: "You can't fight it" },
  { time: 91, text: "You can't breathe" },
  { time: 93, text: "You say something so loving" },
  { time: 95, text: "But no, I gotta let you go" },
  { time: 99, text: "You'll be better off with someone new" },
  { time: 102, text: "I don't want to be alone" },
  { time: 105, text: "You know it hurts me too" },
  { time: 108, text: "You look so broken when you cry" },
  { time: 111, text: "One more and then I'll say goodbye" },
  { time: 113, text: "Sometimes all I think about is you" },
  { time: 116, text: "Late nights in the middle of June" },
  { time: 119, text: "Heat waves been fakin' me out" },
  { time: 122, text: "Can't make you happier now" },
  { time: 125, text: "Sometimes all I think about is you" },
  { time: 128, text: "Late nights in the middle of June" },
  { time: 131, text: "Heat waves been fakin' me out" },
  { time: 134, text: "Can't make you happier now" },
  { time: 138, text: "I just wanna know what you're dreaming of" },
  { time: 140, text: "When you sleep and smile so comfortable" },
  { time: 143, text: "I just wish that I could give you that" },
  { time: 146, text: "That love that's perfectly unsad" },
  { time: 149, text: "Sometimes all I think about is you" },
  { time: 152, text: "Late nights in the middle of June" },
  { time: 155, text: "Heat waves been fakin' me out" },
  { time: 158, text: "Heat waves been fakin' me out" },
  { time: 164, text: "Sometimes all I think about is you" },
  { time: 167, text: "Late nights in the middle of June" },
  { time: 170, text: "Heat waves been fakin' me out" },
  { time: 173, text: "Can't make you happier now" },
  { time: 176, text: "Sometimes all I think about is you" },
  { time: 179, text: "Late nights in the middle of June" },
  { time: 182, text: "Heat waves been fakin' me out" },
  { time: 185, text: "Can't make you happier now" },
  { time: 188, text: "(pop music)" },
];

const letterGlowCSS = `
  .letter {
    transition: text-shadow 0.3s ease;
  }
  .letter:hover {
    text-shadow:
      0 0 8px #fffd87,
      0 0 12px #fffd87,
      0 0 20px #fffd87;
    cursor: pointer;
  }
`;

export default function Home() {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentFrameImg, setCurrentFrameImg] = useState(null);
  const [fallbackImage, setFallbackImage] = useState(pixelArtImage);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Fallback cat image cycling
  useEffect(() => {
    if (currentFrameImg !== null) return;

    const images = [cat1, cat2, pixelArtImage];
    setFallbackImage(images[Math.floor(Math.random() * images.length)]);

    const interval = setInterval(() => {
      setFallbackImage(images[Math.floor(Math.random() * images.length)]);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentFrameImg]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      const currentTime = audio.currentTime;

      let lyricIndex = 0;
      for (let i = 0; i < lyrics.length; i++) {
        if (
          currentTime >= lyrics[i].time &&
          (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)
        ) {
          lyricIndex = i;
          break;
        }
      }
      setCurrentLineIndex(lyricIndex);
      const frameObj = frames.find(
        (f) => currentTime >= f.start && currentTime < f.end
      );
      setCurrentFrameImg(frameObj ? frameObj.img : null);
    }

    function onPlay() {
      setIsPlaying(true);
    }

    function onPause() {
      setIsPlaying(false);
    }

    function onEnded() {
      audio.currentTime = 0;
      audio.play();
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const handleLyricClick = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  function renderLetters(text) {
    return text.split("").map((char, idx) => (
      <span key={idx} className="letter">
        {char}
      </span>
    ));
  }

  return (
    <>
      <style>{letterGlowCSS}</style>
      <main className="relative min-h-screen flex items-center justify-center p-6 select-none overflow-hidden text-white">
        {/* Background GIF */}
        <img
          src={spaceGif}
          alt="Space Background"
          className="absolute inset-0 w-full h-full object-cover -z-20"
          aria-hidden="true"
        />

        <div
          className="max-w-6xl w-full flex gap-20 z-10"
          style={{ minHeight: "500px" }}
        >
          {/* Left side: frames */}
          <div className="flex-1 max-w-md relative flex justify-center items-start h-[400px]">
            <img
              src={currentFrameImg || fallbackImage}
              alt="Visual Frame"
              className="object-contain max-h-full max-w-full"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src={frame}
              alt="Pixel Art Frame"
              className="pointer-events-none absolute top-0 left-0 w-full h-full"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* Right side: lyrics */}
          <div
            className="flex-1 max-w-md flex flex-col ml-8 h-[300px]"
          >
            <div
              onClick={handleLyricClick}
              className="cursor-pointer font-mono text-white whitespace-normal overflow-y-auto rounded-lg transition-all duration-500 text-center"
              style={{
                fontWeight: "bold",
                fontSize: "1.5rem",
                lineHeight: 1.4,
                userSelect: "none",
                maxHeight: "100%",
                display: "block",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              {isPlaying
                ? renderLetters(lyrics[currentLineIndex]?.text || "")
                : lyrics[currentLineIndex]?.text || ""}
              <p className="mt-4 text-sm text-white/50 italic">
                (Click lyrics to {isPlaying ? "pause" : "play"})
              </p>
            </div>
            <div className="mt-4 max-h-[600px] ">
              <ChatBox />
            </div>
          </div>
          
        </div>

        {/* WAVES animated title at bottom center */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto pointer-events-none">
          <WavyTitle />
        </div>

        <audio ref={audioRef} src={music} />
      </main>
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";

export default function StoryComposer({
  width = 1080,
  height = 1920,
  backgroundSrc,
  frameSrc,
  catGifSrc,
  downloadFilename = "wave-story.mp4",
  buttonClass = "",
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Preload background and frame images
  const bgImg = useRef(new Image());
  const frameImg = useRef(new Image());
  useEffect(() => {
    let loaded = 0;
    const onLoad = () => {
      loaded += 1;
      if (loaded === 2) setIsReady(true);
    };
    [bgImg.current, frameImg.current].forEach((img, idx) => {
      img.crossOrigin = "anonymous";
      img.onload = onLoad;
      img.onerror = onLoad;
    });
    bgImg.current.src = backgroundSrc;
    frameImg.current.src = frameSrc;
  }, [backgroundSrc, frameSrc]);

  // Draw loop: background, gif, then frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !isReady) return;
    const ctx = canvas.getContext("2d");
    let raf;
    video.play().catch(() => {});

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      // 1. draw background (story ratio 1080×1920)
      ctx.drawImage(bgImg.current, 0, 0, width, height);
      // 2. draw cat GIF (1:1 square centered)
      if (video.readyState >= 2) {
        const size = width;
        const y = (height - size) / 2;
        ctx.drawImage(video, 0, y, size, size);
      }
      // 3. draw frame overlay same size
      ctx.drawImage(frameImg.current, 0, 0, width, height);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [isReady, width, height]);

  // Export video only
  const handleExportVideo = async () => {
    if (processing || !canvasRef.current) return;
    setProcessing(true);
    const stream = canvasRef.current.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const file = new File([blob], downloadFilename, { type: 'video/mp4' });
      // share via Web Share API
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Story Video' });
        } catch (err) {
          // user cancelled or error
        }
      } else {
        // fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        a.click();
      }
      setProcessing(false);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 10000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <video
        ref={videoRef}
        src={catGifSrc}
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleExportVideo}
        disabled={!isReady || processing}
        className={`px-4 py-2 rounded-lg text-white transition ${buttonClass} ${(!isReady || processing) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
      >
        {processing ? 'Processing…' : isReady ? 'Export 10s Video' : 'Preparing…'}
      </button>
      <p className="text-xs text-white/60 text-center">
        Generates a 10‑second MP4: background (1080×1920), centered 1:1 GIF, then frame.
      </p>
    </div>
  );
}

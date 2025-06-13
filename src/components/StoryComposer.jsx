import React, { useEffect, useRef, useState } from "react";

export default function StoryComposer({
  width = 1080,
  height = 1920,
  backgroundSrc,
  frameSrc,
  catGifSrc,
  duserId = null,
  downloadFilename = "wave-story.png",
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
    [bgImg.current, frameImg.current].forEach((img) => {
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

  // Capture a single image and share with link
  const handleShareStory = async () => {
    if (processing || !canvasRef.current) return;
    setProcessing(true);
    const shareUrl = userId
      ? `${window.location.origin}/?waveId=${encodeURIComponent(userId)}`
      : window.location.href;

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { setProcessing(false); return; }
      const file = new File([blob], downloadFilename, { type: 'image/png' });
      const shareData = { files: [file], url: shareUrl, title: 'Wave Story' };

      try {
        if (navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
        } else if (navigator.share) {
          await navigator.share({ url: shareUrl, title: 'Wave Story' });
        } else {
          const a = document.createElement('a');
          a.href = shareUrl;
          a.target = '_blank';
          a.click();
        }
      } catch {
        // ignore
      }
      setProcessing(false);
    }, 'image/png');
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
        onClick={handleShareStory}
        disabled={!isReady || processing}
        className={`px-4 py-2 rounded-lg text-white transition ${buttonClass} ${(!isReady || processing) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
      >
        {processing ? 'Processing…' : isReady ? 'Share Story' : 'Preparing…'}
      </button>
      <p className="text-xs text-white/60 text-center">
        Shares an image of the story along with your personal link.
      </p>
    </div>
  );
}

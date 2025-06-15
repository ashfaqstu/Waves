import React, { useEffect, useRef, useState } from "react";

export default function StoryComposer({
  width = 1080,
  height = 1920,
  backgroundSrc,
  frameSrc,
  catGifSrc, // now just a static image
  duserId = null,
  downloadFilename = "wave-story.png",
  buttonClass = "",
}) {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const bgImg = useRef(new Image());
  const frameImg = useRef(new Image());
  const catImg = useRef(new Image());

  useEffect(() => {
    let loaded = 0;
    const onLoad = () => {
      loaded += 1;
      if (loaded === 3) setIsReady(true);
    };
    [bgImg.current, frameImg.current, catImg.current].forEach(img => {
      img.crossOrigin = "anonymous";
      img.onload = onLoad;
      img.onerror = onLoad;
    });
    bgImg.current.src = backgroundSrc;
    frameImg.current.src = frameSrc;
    catImg.current.src = catGifSrc;
  }, [backgroundSrc, frameSrc, catGifSrc]);

  useEffect(() => {
    if (!isReady || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    // 1. Draw background cropped to story ratio (1080x1920)
    const bg = bgImg.current;
    const bgRatio = bg.width / bg.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = bg.width, sh = bg.height;
    if (bgRatio > canvasRatio) {
      sw = sh * canvasRatio;
      sx = (bg.width - sw) / 2;
    } else {
      sh = sw / canvasRatio;
      sy = (bg.height - sh) / 2;
    }
    ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, width, height);

    // 2. Draw cat image (1:1 square, centered)
    const size = width;
    const y = (height - size) / 2;
    ctx.drawImage(catImg.current, 0, y, size, size);

    // 3. Draw frame overlay (same 1:1 square, same size as cat)
    ctx.drawImage(frameImg.current, 0, y, size, size);
  }, [isReady, width, height]);

  const handleShareStory = async () => {
    if (processing || !canvasRef.current) return;
    setProcessing(true);

    const shareUrl = duserId
      ? `${window.location.origin}/?waveId=${encodeURIComponent(duserId)}`
      : window.location.href;

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return setProcessing(false);
      const file = new File([blob], downloadFilename, { type: "image/png" });
      const shareData = { files: [file], url: shareUrl, title: "Wave Story" };

      try {
        if (navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
        } else if (navigator.share) {
          await navigator.share({ url: shareUrl, title: "Wave Story" });
        } else {
          const a = document.createElement("a");
          a.href = shareUrl;
          a.target = "_blank";
          a.click();
        }
      } catch {
        // ignore
      }

      setProcessing(false);
    }, "image/png");
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: "none" }}
      />
      <button
        onClick={handleShareStory}
        disabled={!isReady || processing}
        className={`px-4 py-2 rounded-lg text-white transition ${buttonClass} ${(!isReady || processing) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
      >
        {processing ? "Processing…" : isReady ? "Share Story" : "Preparing…"}
      </button>
      <p className="text-xs text-white/60 text-center">
        Shares an image of the story along with your personal link.
      </p>
    </div>
  );
}

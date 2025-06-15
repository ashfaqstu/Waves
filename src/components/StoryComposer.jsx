import React, { useEffect, useRef, useState } from "react";
function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line   = "";

  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, y);
      line = w;
      y   += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, y);  // final line
}

export default function StoryComposer({
  width = 1080,
  height = 1920,
  backgroundSrc,
  frameSrc,
  catGifSrc, // now just a static image
  duserId = null,
  buttonClass = "",
  message = null,
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
  const ctx    = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);

  /* ---------- 1. BACKGROUND CROPPED TO 1080×1920 ---------- */
  {
    const bg           = bgImg.current;
    const bgRatio      = bg.width / bg.height;
    const canvasRatio  = width / height;
    let sx = 0, sy = 0, sw = bg.width, sh = bg.height;

    if (bgRatio > canvasRatio) {
      sw = sh * canvasRatio;
      sx = (bg.width - sw) / 2;
    } else {
      sh = sw / canvasRatio;
      sy = (bg.height - sh) / 2;
    }
    ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, width, height);
  }

  /* ---------- 2. CAT IMAGE or MESSAGE IN 1:1 SQUARE ---------- */
  const squareSide = width / 1.5;              // 720 if width = 1080
  const squareX    = width / 2 - squareSide / 2;
  const squareY    = (height - squareSide) / 2;

  if (!message) {
    ctx.drawImage(catImg.current, squareX, squareY, squareSide, squareSide);
  } else {
    /// ① black background
  // Create semi-transparent background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";  // 50% transparent black
  ctx.fillRect(squareX, squareY, squareSide, squareSide);

  // ② wrapped text ( *inside the same block* )
  ctx.fillStyle   = "white";
  ctx.font        = "40px 'Press Start 2P', sans-serif";
  ctx.textAlign   = "center";
  ctx.textBaseline = "top";

  const padding    = 80;
  const maxW       = squareSide - padding * 2;
  const lineHeight = 40;
  const startY     = squareY + padding;

  wrapText(ctx, message, width / 2, startY, maxW, lineHeight);
    
    }

  /* ---------- 3. FRAME OVERLAY ---------- */
  if (!message)ctx.drawImage(frameImg.current, squareX, squareY, squareSide, squareSide);

    if (message) {
    // wrapped text drawn above the frame so it isn't hidden
    ctx.fillStyle   = "purple";
    ctx.font        = "20px 'Press Start 2P', sans-serif";
    ctx.textAlign   = "center";
    ctx.textBaseline = "top";

    const padding    = 20;
    const maxW       = squareSide - padding * 2;
    const lineHeight = 28;                     // 20-px font ≈ 28-px LH
    const startY     = squareY + padding;

    wrapText(ctx, "Waved Back", width / 2, startY, maxW, lineHeight);
  }

  
  /* ---------- 4. “WAVES” TITLE + BORDER ---------- */
  ctx.font        = "bold 128px 'Press Start 2P', sans-serif";
  ctx.fillStyle   = "#c084fc";
  ctx.textAlign   = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("WAVES", width / 2, 290);

  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth   = 8;
  ctx.strokeRect(squareX - 60, height - 530, squareSide + 100, 200);

  /* ---------- 5. CALL-TO-ACTION ---------- */
  ctx.font      = "bold 60px 'Press Start 2P', sans-serif";
  ctx.fillStyle = "white";
  ctx.fillText(`Wave to "${duserId}"`, width / 2, height - 430);

  /* ---------- 6. URL BADGE ---------- */
  const urlText   = "heatnwaves.netlify.app";
  ctx.font        = "bold 34px 'Press Start 2P', sans-serif";

  const urlW      = ctx.measureText(urlText).width;
  const urlPad    = 20;

  ctx.fillStyle = "purple";
  ctx.fillRect(
    width / 2 - urlW / 2 - urlPad,
    height - 400,
    urlW + urlPad * 2,
    63
  );

  ctx.fillStyle = "white";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(urlText, width / 2, height - 350);
}, [isReady, width, height, duserId, message]);

  const handleShareStory = async () => {
  if (processing || !canvasRef.current) return;
  setProcessing(true);

  canvasRef.current.toBlob(async (blob) => {
    if (!blob) return setProcessing(false);

    const file = new File([blob], "wave-story.png", { type: "image/png" });
    const shareData = {
      files: [file],
      title: "Wave Story",
      text: message || "Wave to me on Heatwaves!",
    };

    try {
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        alert("Sharing not supported on this device. Please download instead.");
      }
    } catch (e) {
      console.warn("Share failed:", e);
    }

    setProcessing(false);
  }, "image/png");
};

   const handleDownload = () => {
    if (processing || !canvasRef.current) return;
    setProcessing(true);
    canvasRef.current.toBlob((blob) => {
      if (!blob) return setProcessing(false);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "wave-story.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
      <button
        onClick={handleDownload}
        disabled={!isReady || processing}
        className={`px-4 py-2 rounded-lg text-white transition bg-gray-600 ${(!isReady || processing) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
      >
        {processing ? "Processing…" : isReady ? "Download Image" : "Preparing…"}
      </button>
      <p className="text-xs text-white/60 text-center">
        Shares an image of the story along with your personal link.
      </p>
    </div>
  );
}

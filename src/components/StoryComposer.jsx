import React, { useEffect, useRef, useState } from "react";

export default function StoryComposer({
  width = 1080,
  height = 1920,
  backgroundSrc,
  frameSrc,
  catGifSrc, // now just a static image
  duserId = null,
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
    ctx.drawImage(catImg.current, width/2-size/3, y, size/1.5, size/1.5);

    // 3. Draw frame overlay (same 1:1 square, same size as cat)
    ctx.drawImage(frameImg.current, width/2-size/3, y, size/1.5, size/1.5);
  // 4. Draw site title at the top
    ctx.font = "bold 128px 'Press Start 2P', sans-serif";
    ctx.fillStyle = "#c084fc"; // tailwind purple-400
    ctx.textAlign = "center";
    ctx.fillText("WAVES", width / 2, 290);

    // Draw decorative border rectangle
    ctx.strokeStyle = "#c084fc"; // Matching title color (purple)
    ctx.lineWidth = 8;
    ctx.strokeRect(width/2-size/3-60, height - 600, size/1.5+100, 200); // x, y, width, height

    // 5. Draw call to action text below the frame
    ctx.font = "bold 60px 'Press Start 2P', sans-serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(`Wave to "${duserId}"`, width / 2, height - 500);


    // Add black background for URL text
    const urlText = `heatnwaves.netlify.app`;
    ctx.font = "bold 34px 'Press Start 2P', sans-serif";
    const textMetrics = ctx.measureText(urlText);
    const textWidth = textMetrics.width;
    
    // Draw black background rectangle
    const padding = 20;
    ctx.fillStyle = "purple";
    ctx.fillRect(
      width / 2 - textWidth / 2 - padding,
      height - 470, // Position slightly higher than text
      textWidth + padding * 2-10,
      63 // Height of background
    );
    
    // Draw text on top
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(urlText, width / 2, height - 420);
  }, [isReady, width, height, duserId]);

  const handleShareStory = async () => {
  if (processing || !canvasRef.current) return;
  setProcessing(true);

  canvasRef.current.toBlob(async (blob) => {
    if (!blob) return setProcessing(false);

    const file = new File([blob], "wave-story.png", { type: "image/png" });
    const shareData = {
      files: [file],
      title: "Wave Story",
      text: "Wave to me on Heatwaves!",
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

import { useEffect, useState } from 'react';

const useMoodGraphic = (moodKeyword) => {
  const [graphicUrl, setGraphicUrl] = useState('/assets/visuals/loading.gif'); // fallback

  useEffect(() => {
    if (!moodKeyword) return;

    const fetchGraphic = async () => {
      try {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(moodKeyword)}&limit=1&api_key=ly4Iz6M9JZEsPPOmm2URRTvg37Y1TIbS`
        );
        const data = await res.json();
        const gif = data.data[0]?.images?.downsized_medium?.url;

        if (gif) {
          setGraphicUrl(gif);
        } else {
          setGraphicUrl('/assets/visuals/default.gif');
        }
      } catch (err) {
        console.error('Failed to fetch mood graphic:', err);
        setGraphicUrl('/assets/visuals/error.gif');
      }
    };

    fetchGraphic();
  }, [moodKeyword]);

  return graphicUrl;
};

export default useMoodGraphic;

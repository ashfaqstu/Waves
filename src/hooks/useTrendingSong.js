import { useEffect, useState } from 'react';

const useTrendingSong = () => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [lyrics, setLyrics] = useState([]);
  const [mood, setMood] = useState('default');

  const getMoodFromTitle = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('love')) return 'love';
    if (lower.includes('fire')) return 'fire';
    if (lower.includes('happy')) return 'happy';
    if (lower.includes('sad')) return 'sad';
    if (lower.includes('party') || lower.includes('dance')) return 'party';
    return 'default';
  };

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const res = await fetch(
          'https://shazam.p.rapidapi.com/charts/track?locale=en-US&pageSize=1&startFrom=0',
          {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': 'bc2a11c32amsh7834f24b7418e1dp1d023ejsn942fb661919d', // Replace this
              'X-RapidAPI-Host': 'shazam.p.rapidapi.com',
            },
          }
        );

        const data = await res.json();
        const song = data.tracks?.[0];

        if (!song) {
          console.warn('No trending song found.');
          return;
        }

        const preview = song.hub?.actions?.find(a => a.uri)?.uri || '';

        setTitle(song.title || 'Unknown Title');
        setArtist(song.subtitle || 'Unknown Artist');
        setPreviewUrl(preview);
        setLyrics([
          'You', 'are', 'the', 'rhythm', 'of', 'my', 'heart',
          'Beating', 'like', 'a', 'song', 'I', 'can’t', 'stop'
        ]);
        setMood(getMoodFromTitle(song.title));

        console.log('✅ Loaded song:', song.title);
      } catch (err) {
        console.error('Error fetching song:', err);
        // Fallback if API fails
        setTitle('Fallback Song');
        setArtist('Fallback Artist');
        setPreviewUrl('https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/01/4c/c7/014cc7be-2324-9863-bdc1-6be7b8b0cc1e/mzaf_4112790129607760151.plus.aac.p.m4a');
        setLyrics(['I', 'love', 'you', 'like', 'a', 'love', 'song']);
        setMood('love');
      }
    };

    fetchSong();
  }, []);

  return { previewUrl, title, artist, lyrics, mood };
};

export default useTrendingSong;

import { useEffect } from 'react';

export default function useButtonSounds() {
  useEffect(() => {
    const hoverAudio = new Audio('/assets/sounds/hover.wav');
    const clickAudio = new Audio('/assets/sounds/click.wav');

    const play = (audio) => {
      audio.currentTime = 0;
      audio.play();
    };

    const onHover = (e) => {
      if (e.target.tagName === 'BUTTON') play(hoverAudio);
    };
    const onClick = (e) => {
      if (e.target.tagName === 'BUTTON') play(clickAudio);
    };

    document.addEventListener('mouseover', onHover);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('mouseover', onHover);
      document.removeEventListener('click', onClick);
    };
  }, []);
}
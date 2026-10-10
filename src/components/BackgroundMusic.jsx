import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import musicSrc from '../assets/Subho.mp3';

const MUTE_KEY = 'pujotrack.musicMuted';

export default function BackgroundMusic({ volume = 0.4 }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(() => {
    try {
      return window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.volume = volume;

    const events = ['pointerdown', 'keydown', 'touchstart'];
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, start));

    function start() {
      if (mutedRef.current || !audio.paused) return;
      audio.play().catch(() => {}); // still blocked: wait for the next interaction
    }

    audio.addEventListener('play', cleanup); // started, so stop listening
    events.forEach((e) => window.addEventListener(e, start));
    start(); // try immediately; works if the browser allows autoplay

    return () => {
      audio.removeEventListener('play', cleanup);
      cleanup();
    };
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    try {
      window.localStorage.setItem(MUTE_KEY, nextMuted ? '1' : '0');
    } catch {
      /* preference just won't persist */
    }
    if (nextMuted) audio?.pause();
    else audio?.play().catch(() => {});
  };

  return (
    <>
      <audio ref={audioRef} src={musicSrc} loop preload="auto" />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        aria-label={muted ? 'Turn background music on' : 'Turn background music off'}
        title={muted ? 'Music off' : 'Music on'}
        className="fixed bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-[#E2D9C6] bg-white text-[#D9381E] shadow-lg transition-colors hover:bg-[#FBF8F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B58B2E]"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </>
  );
}
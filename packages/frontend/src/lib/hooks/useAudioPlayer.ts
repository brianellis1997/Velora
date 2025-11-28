import { useState, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((base64Audio: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);

    audio.onplay = () => {
      setIsPlaying(true);
      setCurrentAudio(base64Audio);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
      audioRef.current = null;
    };

    audioRef.current = audio;
    audio.play().catch((error) => {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  }, []);

  return {
    isPlaying,
    currentAudio,
    playAudio,
    stopAudio,
  };
}

'use client';

import { useCallback, useEffect } from 'react';
import { useMeetingStore } from '@/stores/meeting-store';

export function useFullscreen() {
  const { isFullscreen, setIsFullscreen } = useMeetingStore();

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [setIsFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // user agent may block fullscreen
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}

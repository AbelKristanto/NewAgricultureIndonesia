'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type AudioContextConstructor = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

const STORAGE_KEY = 'serenagri-ui-sound';

function getInitialEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export default function UiSoundEffects() {
  const { lang } = useLanguage();
  const [enabled, setEnabled] = useState(getInitialEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  }, [enabled]);

  useEffect(() => {
    const playClickSound = () => {
      if (!enabledRef.current) return;

      const AudioCtor =
        window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioCtor) return;

      const context = audioContextRef.current ?? new AudioCtor();
      audioContextRef.current = context;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(680, now);
      oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.06);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.085);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(
        'button, a[href], [role="button"], input[type="button"], input[type="submit"]'
      );
      if (!interactive) return;
      if (interactive.getAttribute('data-sound') === 'off') return;
      if (interactive.hasAttribute('disabled') || interactive.getAttribute('aria-disabled') === 'true') {
        return;
      }

      playClickSound();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setEnabled((current) => !current)}
      className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-500 shadow-lg transition-colors hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      title={enabled ? (lang === 'en' ? 'Turn off button sounds' : 'Matikan suara tombol') : (lang === 'en' ? 'Turn on button sounds' : 'Nyalakan suara tombol')}
      aria-label={enabled ? (lang === 'en' ? 'Turn off button sounds' : 'Matikan suara tombol') : (lang === 'en' ? 'Turn on button sounds' : 'Nyalakan suara tombol')}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}

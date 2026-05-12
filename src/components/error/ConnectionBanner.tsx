'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 30_000; // 30 seconds
const AUTO_DISMISS_MS = 5_000; // 5 seconds

type ConnectionStatus = 'connected' | 'disconnected' | 'max_retries_exceeded';

export function ConnectionBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const checkConnection = async (): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const startMonitoring = async () => {
      const isConnected = await checkConnection();

      if (!isMountedRef.current) return;

      if (isConnected) {
        setStatus('connected');
        return;
      }

      // Initial connection failure detected
      setStatus('disconnected');
      setRetryCount(1);

      // Start retry interval
      intervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;

        const connected = await checkConnection();

        if (!isMountedRef.current) return;

        if (connected) {
          // Connection restored - auto-dismiss after 5 seconds
          clearRetryInterval();
          dismissTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setStatus('connected');
              setRetryCount(0);
            }
          }, AUTO_DISMISS_MS);
          return;
        }

        setRetryCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_RETRIES) {
            clearRetryInterval();
            setStatus('max_retries_exceeded');
          }
          return next;
        });
      }, RETRY_INTERVAL_MS);
    };

    startMonitoring();

    return () => {
      isMountedRef.current = false;
      clearRetryInterval();
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, []);

  const clearRetryInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  if (status === 'connected') {
    return null;
  }

  const isMaxRetries = status === 'max_retries_exceeded';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-red-600 text-white shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className="text-sm font-medium truncate">
          {isMaxRetries
            ? 'Koneksi terputus. Periksa jaringan Anda dan muat ulang halaman.'
            : 'Koneksi terputus. Mencoba menghubungkan kembali...'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isMaxRetries && (
          <span className="text-xs text-red-100">
            ({retryCount}/{MAX_RETRIES})
          </span>
        )}
        <button
          onClick={handleReload}
          className="px-3 py-1 text-sm font-medium bg-white text-red-600 rounded hover:bg-red-50 transition-colors"
        >
          Muat Ulang
        </button>
      </div>
    </div>
  );
}

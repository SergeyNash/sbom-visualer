import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from './apiService';

export type BackendStatus = 'unknown' | 'online' | 'offline';

export interface BackendHealthState {
  status: BackendStatus;
  lastCheckedAt?: number;
  lastError?: string;
}

const HEALTH_URL = `${API_BASE_URL.replace(/\/api$/, '')}/api/health`;

export function useBackendHealth(pollIntervalMs: number = 5000): BackendHealthState {
  const [state, setState] = useState<BackendHealthState>({ status: 'unknown' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let disposed = false;

    const check = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(HEALTH_URL, {
          method: 'GET',
          signal: ac.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        if (disposed) return;
        setState({ status: 'online', lastCheckedAt: Date.now() });
      } catch (err) {
        if (disposed) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState({ status: 'offline', lastCheckedAt: Date.now(), lastError: msg });
      }
    };

    // initial check and polling
    check();
    timer = window.setInterval(check, pollIntervalMs);

    return () => {
      disposed = true;
      abortRef.current?.abort();
      if (timer) window.clearInterval(timer);
    };
  }, [pollIntervalMs]);

  return state;
}


'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { getApiUrl } from '../lib/constants';

interface SimliConfig {
  apiKey: string;
  faceId: string;
}

export function useSimli() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const configRef = useRef<SimliConfig | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);

  // Check if Simli is configured on mount
  useEffect(() => {
    let cancelled = false;

    async function checkConfig() {
      try {
        const res = await fetch(`${getApiUrl()}/api/simli/config`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.configured) {
            configRef.current = { apiKey: data.apiKey, faceId: data.faceId };
            setIsAvailable(true);
            console.log('[Simli] Configuration available');
          }
        }
      } catch {
        // Simli not available, fall back to CSS avatar
        console.log('[Simli] Not configured, using CSS avatar');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkConfig();
    return () => { cancelled = true; };
  }, []);

  const initialize = useCallback(async (
    videoElement: HTMLVideoElement,
    audioElement: HTMLAudioElement
  ): Promise<boolean> => {
    if (!configRef.current) return false;

    try {
      // Dynamic import to avoid SSR issues
      const { SimliClient } = await import('simli-client');

      const client = new SimliClient();
      client.Initialize({
        apiKey: configRef.current.apiKey,
        faceID: configRef.current.faceId,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
        session_token: '',
        videoRef: videoElement,
        audioRef: audioElement,
        SimliURL: '',
        maxRetryAttempts: 100,
        retryDelay_ms: 2000,
        videoReceivedTimeout: 15000,
        enableSFU: true,
        model: '',
      });

      await client.start();
      clientRef.current = client;
      setIsReady(true);
      console.log('[Simli] Avatar initialized and ready');
      return true;
    } catch (err) {
      console.error('[Simli] Initialization failed:', err);
      setIsAvailable(false);
      return false;
    }
  }, []);

  const sendAudioData = useCallback((pcmUint8Array: Uint8Array) => {
    if (clientRef.current) {
      try {
        clientRef.current.sendAudioData(pcmUint8Array);
      } catch (err) {
        console.error('[Simli] Send audio error:', err);
      }
    }
  }, []);

  const close = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.close();
      } catch { /* already closed */ }
      clientRef.current = null;
      setIsReady(false);
      console.log('[Simli] Connection closed');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isAvailable,
    isReady,
    isLoading,
    initialize,
    sendAudioData,
    close,
  };
}

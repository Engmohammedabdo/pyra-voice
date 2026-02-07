'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

// Smooth audio playback: base64 PCM 24kHz -> speaker
export function useAudioPlayback(onRawPcm?: (data: Uint8Array) => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<AudioBuffer[]>([]);
  const nextTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const onRawPcmRef = useRef(onRawPcm);
  useEffect(() => { onRawPcmRef.current = onRawPcm; }, [onRawPcm]);
  const gainRef = useRef<GainNode | null>(null);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new AudioContext({ sampleRate: 24000 });
      const analyser = contextRef.current.createAnalyser();
      analyser.fftSize = 256;
      const gain = contextRef.current.createGain();
      gain.gain.value = onRawPcmRef.current ? 0.0 : 1.0;
      gainRef.current = gain;
      analyser.connect(gain);
      gain.connect(contextRef.current.destination);
      analyserRef.current = analyser;
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume();
    }
    return contextRef.current;
  }, []);

  const playQueue = useCallback(() => {
    const ctx = getContext();
    if (!analyserRef.current) return;

    while (queueRef.current.length > 0) {
      const buffer = queueRef.current.shift()!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyserRef.current);

      const startTime = Math.max(ctx.currentTime, nextTimeRef.current);
      source.start(startTime);
      nextTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current.add(source);

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (queueRef.current.length === 0 && activeSourcesRef.current.size === 0) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      };
    }
  }, [getContext]);

  const enqueue = useCallback(
    (base64Pcm: string) => {
      try {
        const ctx = getContext();
        const binary = atob(base64Pcm);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        // Route raw PCM to Simli if callback provided
        if (onRawPcmRef.current) {
          onRawPcmRef.current(new Uint8Array(bytes));
        }
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }
        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);
        queueRef.current.push(audioBuffer);

        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          setIsPlaying(true);
        }
        playQueue();
      } catch (err) {
        console.error('Audio playback error:', err);
      }
    },
    [getContext, playQueue]
  );

  const flush = useCallback(() => {
    queueRef.current = [];
    nextTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsPlaying(false);

    // Stop all active sources before closing context
    activeSourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    activeSourcesRef.current.clear();

    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const getAnalyserData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  return { isPlaying, enqueue, flush, getAnalyserData };
}

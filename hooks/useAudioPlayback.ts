'use client';

import { useCallback, useRef, useState } from 'react';

// Smooth audio playback: base64 PCM 24kHz → speaker
export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<AudioBuffer[]>([]);
  const nextTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new AudioContext({ sampleRate: 24000 });
      const analyser = contextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(contextRef.current.destination);
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

      source.onended = () => {
        if (queueRef.current.length === 0 && ctx.currentTime >= nextTimeRef.current - 0.05) {
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
        // Decode base64 → binary
        const binary = atob(base64Pcm);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        // Int16 → Float32
        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }
        // Create AudioBuffer
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
    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close();
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

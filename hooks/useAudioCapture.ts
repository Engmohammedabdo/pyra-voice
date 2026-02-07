'use client';

import { useCallback, useRef, useState } from 'react';

// AudioWorklet runs in a separate scope where btoa/atob are NOT available.
// So we send the raw PCM bytes via postMessage (transferable) and do
// the base64 encoding on the main thread instead.
const WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0 && input[0].length > 0) {
      const float32 = input[0];
      const pcm16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      // Send raw bytes to main thread (transferable for zero-copy)
      const buffer = pcm16.buffer.slice(0);
      this.port.postMessage(buffer, [buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);
`;

// Convert ArrayBuffer to base64 string (runs on main thread where btoa is available)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// PCM 16-bit, 16kHz mono capture with AudioWorklet (fallback to ScriptProcessor)
export function useAudioCapture(onAudioChunk: (base64: string) => void) {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const onChunkRef = useRef(onAudioChunk);
  onChunkRef.current = onAudioChunk;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const context = new AudioContext({ sampleRate: 16000 });
      contextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Try AudioWorklet first (runs off main thread), fall back to ScriptProcessor
      try {
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await context.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const worklet = new AudioWorkletNode(context, 'pcm-processor');
        processorRef.current = worklet;

        worklet.port.onmessage = (e: MessageEvent) => {
          // e.data is an ArrayBuffer (raw PCM bytes from worklet)
          // Convert to base64 here on main thread where btoa is available
          const base64 = arrayBufferToBase64(e.data);
          onChunkRef.current(base64);
        };

        source.connect(worklet);
        worklet.connect(context.destination);

        console.log('[AudioCapture] Using AudioWorklet ✅');
      } catch {
        console.warn('[AudioCapture] AudioWorklet unavailable, using ScriptProcessor fallback');
        const processor = context.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const base64 = arrayBufferToBase64(pcm16.buffer);
          onChunkRef.current(base64);
        };

        source.connect(processor);
        processor.connect(context.destination);
      }

      setIsCapturing(true);
    } catch (err) {
      console.error('Mic capture error:', err);
      throw err;
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    contextRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    contextRef.current = null;
    streamRef.current = null;
    setIsCapturing(false);
  }, []);

  const getAnalyserData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  return { isCapturing, start, stop, getAnalyserData };
}

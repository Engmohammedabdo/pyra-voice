'use client';

import { useCallback, useRef, useState } from 'react';
import { WS_URL, SessionState, TranscriptEntry } from '../lib/constants';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';

export function useVoiceSession() {
  const [state, setState] = useState<SessionState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const playback = useAudioPlayback();

  const sendAudioChunk = useCallback((base64: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
    }
  }, []);

  const capture = useAudioCapture(sendAudioChunk);

  const addTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscripts((prev) => {
      // If last entry is same role, append text
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: updated[updated.length - 1].text + ' ' + text,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          role,
          text,
          timestamp: Date.now(),
        },
      ];
    });
  }, []);

  const startSession = useCallback(async () => {
    if (wsRef.current) return;

    setState('connecting');
    setErrorMessage(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'start' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'session':
              sessionIdRef.current = msg.sessionId;
              break;

            case 'ready':
              setState('listening');
              capture.start().catch((err) => {
                setState('error');
                setErrorMessage('Microphone access denied. Please allow mic access.');
              });
              break;

            case 'audio':
              if (state !== 'speaking') setState('speaking');
              playback.enqueue(msg.data);
              break;

            case 'transcript':
              if (msg.text) {
                addTranscript('assistant', msg.text);
              }
              break;

            case 'turn_complete':
              if (capture.isCapturing) {
                setState('listening');
              }
              break;

            case 'error':
              setState('error');
              setErrorMessage(msg.message || 'An error occurred');
              break;
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      ws.onerror = () => {
        setState('error');
        setErrorMessage('Connection error. Please try again.');
      };

      ws.onclose = () => {
        wsRef.current = null;
        capture.stop();
        playback.flush();
        if (state !== 'error') {
          setState('idle');
        }
      };
    } catch (err) {
      setState('error');
      setErrorMessage('Failed to connect. Please try again.');
    }
  }, [capture, playback, addTranscript, state]);

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    capture.stop();
    playback.flush();
    setState('idle');
    sessionIdRef.current = null;
  }, [capture, playback]);

  const retry = useCallback(() => {
    endSession();
    setTimeout(() => startSession(), 500);
  }, [endSession, startSession]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    state,
    transcripts,
    errorMessage,
    isPlaying: playback.isPlaying,
    isCapturing: capture.isCapturing,
    startSession,
    endSession,
    retry,
    clearTranscripts,
    getCaptureAnalyser: capture.getAnalyserData,
    getPlaybackAnalyser: playback.getAnalyserData,
  };
}

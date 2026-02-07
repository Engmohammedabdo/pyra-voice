'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { getWsUrl, SessionState, TranscriptEntry } from '../lib/constants';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';

export function useVoiceSession(options?: { onRawAudio?: (data: Uint8Array) => void }) {
  const [state, setState] = useState<SessionState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const stateRef = useRef<SessionState>('idle');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const playback = useAudioPlayback(options?.onRawAudio);
  const playbackRef = useRef(playback);
  useEffect(() => { playbackRef.current = playback; }, [playback]);

  const sendAudioChunk = useCallback((base64: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
    }
  }, []);

  const capture = useAudioCapture(sendAudioChunk);
  const captureRef = useRef(capture);
  useEffect(() => { captureRef.current = capture; }, [capture]);

  const lastTurnRoleRef = useRef<'user' | 'assistant' | null>(null);

  const addTranscript = useCallback((role: 'user' | 'assistant', text: string, newTurn = false) => {
    setTranscripts((prev) => {
      const forceNew = newTurn || (role !== lastTurnRoleRef.current);
      lastTurnRoleRef.current = role;

      if (!forceNew && prev.length > 0 && prev[prev.length - 1].role === role) {
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

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    captureRef.current.stop();
    playbackRef.current.flush();
    sessionIdRef.current = null;
    lastTurnRoleRef.current = null;
  }, []);

  const startSession = useCallback(async () => {
    if (wsRef.current) return;

    setState('connecting');
    setErrorMessage(null);
    setTranscripts([]);

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
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
              captureRef.current.start().catch(() => {
                setState('error');
                setErrorMessage('Microphone access denied. Please allow mic access and try again.');
              });
              break;

            case 'audio':
              if (stateRef.current !== 'speaking') setState('speaking');
              playbackRef.current.enqueue(msg.data);
              break;

            case 'transcript':
              if (msg.text) {
                addTranscript('assistant', msg.text);
              }
              break;

            case 'turn_complete':
              lastTurnRoleRef.current = null;
              if (captureRef.current.isCapturing) {
                setState('listening');
              }
              break;

            case 'error':
              setState('error');
              setErrorMessage(msg.message || 'An error occurred');
              break;

            case 'ended':
              cleanup();
              setState('idle');
              break;
          }
        } catch (err) {
          console.error('[WS] Message parse error:', err);
        }
      };

      ws.onerror = () => {
        setState('error');
        setErrorMessage('Connection error. Please check your network and try again.');
      };

      ws.onclose = () => {
        wsRef.current = null;
        captureRef.current.stop();
        playbackRef.current.flush();
        if (stateRef.current !== 'error' && stateRef.current !== 'idle') {
          setState('idle');
        }
      };
    } catch {
      setState('error');
      setErrorMessage('Failed to connect. Please try again.');
    }
  }, [addTranscript, cleanup]);

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    cleanup();
    setState('idle');
  }, [cleanup]);

  const retry = useCallback(() => {
    cleanup();
    setState('idle');
    setTimeout(() => startSession(), 300);
  }, [cleanup, startSession]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  useEffect(() => {
    return () => { cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    transcripts,
    errorMessage,
    isPlaying: playback.isPlaying,
    isCapturing: capture.isCapturing,
    sessionId: sessionIdRef.current,
    startSession,
    endSession,
    retry,
    clearTranscripts,
    getCaptureAnalyser: capture.getAnalyserData,
    getPlaybackAnalyser: playback.getAnalyserData,
  };
}

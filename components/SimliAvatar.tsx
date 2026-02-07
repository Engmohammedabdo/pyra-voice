'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SessionState } from '../lib/constants';

interface SimliAvatarProps {
  state: SessionState;
  isSpeaking: boolean;
  onReady: (videoEl: HTMLVideoElement, audioEl: HTMLAudioElement) => void;
}

export default function SimliAvatar({ state, isSpeaking, onReady }: SimliAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const initializedRef = useRef(false);

  const stableOnReady = useCallback(onReady, [onReady]);

  useEffect(() => {
    if (videoRef.current && audioRef.current && !initializedRef.current) {
      initializedRef.current = true;
      stableOnReady(videoRef.current, audioRef.current);
    }
  }, [stableOnReady]);

  const isActive = state === 'listening' || state === 'speaking' || state === 'processing';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings when speaking */}
      {isSpeaking && (
        <>
          <div className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-purple-500/10 animate-pulse" style={{ animationDuration: '2.5s' }} />
        </>
      )}

      {/* Background glow */}
      <div
        className={`absolute w-48 h-48 md:w-64 md:h-64 rounded-full transition-all duration-700 ${
          isSpeaking
            ? 'bg-purple-600/30 blur-[60px] scale-110'
            : isActive
            ? 'bg-purple-600/20 blur-[50px] scale-100'
            : 'bg-purple-600/10 blur-[40px] scale-95'
        }`}
      />

      {/* Video container */}
      <div
        className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full overflow-hidden transition-all duration-500 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] ${
          isActive
            ? 'ring-4 ring-purple-500/50 shadow-lg shadow-purple-500/20'
            : 'ring-2 ring-white/10'
        } ${isSpeaking ? 'scale-105' : 'scale-100'}`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

        {/* Connecting overlay */}
        {state === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Processing overlay */}
        {state === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <div className="flex space-x-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

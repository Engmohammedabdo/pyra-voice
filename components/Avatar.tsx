'use client';

import { SessionState } from '../lib/constants';

interface AvatarProps {
  state: SessionState;
  isSpeaking: boolean;
}

export default function Avatar({ state, isSpeaking }: AvatarProps) {
  const isActive = state === 'listening' || state === 'speaking' || state === 'processing';

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      {isSpeaking && (
        <>
          <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-brand-primary/20 animate-pulse-ring" />
          <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-brand-primary/10 animate-pulse-ring [animation-delay:0.5s]" />
        </>
      )}

      {/* Glow behind avatar */}
      <div
        className={`absolute w-48 h-48 md:w-64 md:h-64 rounded-full transition-all duration-700 ${
          isSpeaking
            ? 'bg-brand-primary/30 blur-[60px] scale-110'
            : isActive
            ? 'bg-brand-primary/20 blur-[50px] scale-100'
            : 'bg-brand-primary/10 blur-[40px] scale-95'
        }`}
      />

      {/* Avatar container */}
      <div
        className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full overflow-hidden transition-all duration-500 ${
          isActive ? 'ring-4 ring-brand-primary/50' : 'ring-2 ring-white/10'
        }`}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        {/* Fallback avatar: animated gradient face */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Face circle */}
            <div
              className={`w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-brand-primary/40 to-blue-500/40 flex items-center justify-center transition-all duration-500 ${
                isSpeaking ? 'scale-105' : 'scale-100'
              }`}
            >
              {/* Simple face */}
              <div className="relative w-20 h-20 md:w-24 md:h-24">
                {/* Eyes */}
                <div className="absolute top-4 left-3 md:top-5 md:left-4 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white/80" />
                <div className="absolute top-4 right-3 md:top-5 md:right-4 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white/80" />
                {/* Mouth - animated when speaking */}
                <div
                  className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/60 transition-all duration-150 ${
                    isSpeaking
                      ? 'w-6 h-4 md:w-8 md:h-5 animate-pulse'
                      : 'w-6 h-2 md:w-8 md:h-2'
                  }`}
                />
              </div>
            </div>

            {/* Breathing animation */}
            {state === 'idle' && (
              <div className="absolute inset-0 rounded-full border-2 border-brand-primary/20 animate-float" />
            )}
          </div>
        </div>

        {/* Processing overlay */}
        {state === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Connecting overlay */}
        {state === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

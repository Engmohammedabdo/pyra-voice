'use client';

import { SessionState } from '../lib/constants';

interface VoiceButtonProps {
  state: SessionState;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  lang: 'en' | 'ar';
}

const labels = {
  en: {
    idle: '🎤 Talk to Pyra',
    connecting: 'Connecting...',
    listening: '🔴 Listening... (tap to stop)',
    processing: 'Thinking...',
    speaking: '🔊 Pyra is speaking...',
    error: '⚠️ Retry',
  },
  ar: {
    idle: '🎤 تحدث مع بايرا',
    connecting: 'جاري الاتصال...',
    listening: '🔴 أستمع... (اضغط للإيقاف)',
    processing: 'أفكر...',
    speaking: '🔊 بايرا تتحدث...',
    error: '⚠️ إعادة المحاولة',
  },
};

export default function VoiceButton({ state, onStart, onStop, onRetry, lang }: VoiceButtonProps) {
  const label = labels[lang][state];

  const handleClick = () => {
    if (state === 'idle') onStart();
    else if (state === 'listening' || state === 'speaking' || state === 'processing') onStop();
    else if (state === 'error') onRetry();
  };

  const isIdle = state === 'idle';
  const isListening = state === 'listening';
  const isError = state === 'error';
  const isConnecting = state === 'connecting';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings for idle state */}
      {isIdle && (
        <div className="absolute w-full h-full">
          <div className="absolute inset-0 rounded-full bg-brand-primary/20 animate-pulse-glow" />
        </div>
      )}

      {/* Listening pulse ring */}
      {isListening && (
        <>
          <div className="absolute w-full h-full rounded-full border-2 border-red-500/40 animate-pulse-ring" />
          <div className="absolute w-full h-full rounded-full border-2 border-red-500/20 animate-pulse-ring [animation-delay:0.75s]" />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={`
          relative z-10 px-8 py-4 rounded-full font-semibold text-base md:text-lg
          transition-all duration-300 transform
          ${isConnecting ? 'cursor-wait' : 'cursor-pointer hover:scale-105 active:scale-95'}
          ${
            isIdle
              ? 'bg-gradient-to-r from-brand-primary to-blue-500 text-white shadow-xl shadow-brand-primary/30 hover:shadow-brand-primary/50'
              : isListening
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/30'
              : isError
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/30'
              : 'bg-white/10 text-white/80 backdrop-blur-md border border-white/10'
          }
        `}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {isConnecting && (
          <span className="inline-block w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin align-middle" />
        )}
        {label}
      </button>
    </div>
  );
}

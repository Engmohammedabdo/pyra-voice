'use client';

import { useState } from 'react';
import Background from '../components/Background';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import VoiceButton from '../components/VoiceButton';
import WaveForm from '../components/WaveForm';
import Transcript from '../components/Transcript';
import { useVoiceSession } from '../hooks/useVoiceSession';

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const session = useVoiceSession();

  const isAr = lang === 'ar';

  return (
    <main className="relative min-h-screen flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <Background />

      <Header lang={lang} onLanguageChange={setLang} />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8 -mt-8">
        {/* Avatar */}
        <div className="mb-6">
          <Avatar state={session.state} isSpeaking={session.isPlaying} />
        </div>

        {/* Tagline */}
        <p
          className="text-white/60 text-base md:text-lg mb-8 text-center max-w-md font-light"
          dir={isAr ? 'rtl' : 'ltr'}
          style={isAr ? { fontFamily: "'Tajawal', sans-serif" } : undefined}
        >
          {isAr
            ? 'مرحباً! أنا بايرا، مساعدتك الذكية من بيراميديا'
            : "Hi! I'm Pyra, your intelligent AI assistant by Pyramedia"}
        </p>

        {/* Waveform visualization */}
        <div className="mb-4 h-12 flex items-center justify-center">
          {session.state === 'listening' && (
            <WaveForm
              getAnalyserData={session.getCaptureAnalyser}
              isActive={session.isCapturing}
              color="#ef4444"
              barCount={32}
            />
          )}
          {session.state === 'speaking' && (
            <WaveForm
              getAnalyserData={session.getPlaybackAnalyser}
              isActive={session.isPlaying}
              color="#6C3AED"
              barCount={32}
            />
          )}
        </div>

        {/* Voice button */}
        <div className="mb-4">
          <VoiceButton
            state={session.state}
            onStart={session.startSession}
            onStop={session.endSession}
            onRetry={session.retry}
            lang={lang}
          />
        </div>

        {/* Error message */}
        {session.errorMessage && (
          <div className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center max-w-sm">
            {session.errorMessage}
          </div>
        )}

        {/* Transcript */}
        <Transcript entries={session.transcripts} lang={lang} />
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center border-t border-white/5">
        <p className="text-white/25 text-xs">
          Powered by{' '}
          <a
            href="https://pyramedia.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary/60 hover:text-brand-primary transition-colors"
          >
            Pyramedia
          </a>{' '}
          | pyramedia.ai
        </p>
      </footer>
    </main>
  );
}

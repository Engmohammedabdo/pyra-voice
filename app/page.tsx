'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Background from '../components/Background';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import SimliAvatar from '../components/SimliAvatar';
import VoiceButton from '../components/VoiceButton';
import WaveForm from '../components/WaveForm';
import Transcript from '../components/Transcript';
import LeadForm from '../components/LeadForm';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { useSimli } from '../hooks/useSimli';

export default function Home() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  // Simli avatar integration
  const simli = useSimli();

  const simliAudioCallback = useCallback((data: Uint8Array) => {
    simli.sendAudioData(data);
  }, [simli]);

  const voiceSessionOptions = useMemo(() =>
    simli.isReady ? { onRawAudio: simliAudioCallback } : undefined,
    [simli.isReady, simliAudioCallback]
  );

  const session = useVoiceSession(voiceSessionOptions);

  // Detect when session ends to show lead form
  const prevStateRef = useRef(session.state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = session.state;

    // Show lead form when session transitions from active → idle
    if (
      session.state === 'idle' &&
      (prev === 'listening' || prev === 'speaking' || prev === 'processing')
    ) {
      setLastSessionId(session.sessionId);
      // Small delay for smoother UX
      setTimeout(() => setShowLeadForm(true), 500);
    }
  }, [session.state, session.sessionId]);

  // Simli avatar initialization
  const handleSimliReady = useCallback(async (videoEl: HTMLVideoElement, audioEl: HTMLAudioElement) => {
    await simli.initialize(videoEl, audioEl);
  }, [simli]);

  const isAr = lang === 'ar';

  return (
    <main className="relative min-h-screen flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <Background />

      <Header lang={lang} onLanguageChange={setLang} />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8 -mt-8">
        {/* Avatar — Simli (video) or fallback (CSS) */}
        <div className="mb-6">
          {!simli.isLoading && simli.isAvailable ? (
            <SimliAvatar
              state={session.state}
              isSpeaking={session.isPlaying}
              onReady={handleSimliReady}
            />
          ) : (
            <Avatar state={session.state} isSpeaking={session.isPlaying} />
          )}
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

      {/* Lead capture form — shown after conversation ends */}
      {showLeadForm && (
        <LeadForm
          sessionId={lastSessionId}
          lang={lang}
          onClose={() => setShowLeadForm(false)}
        />
      )}

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

'use client';

import { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../lib/constants';

interface TranscriptProps {
  entries: TranscriptEntry[];
  lang: 'en' | 'ar';
}

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export default function Transcript({ entries, lang }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto mt-6">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 text-center">
          <p className="text-white/30 text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {lang === 'ar'
              ? 'ستظهر المحادثة هنا...'
              : 'Conversation will appear here...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-6">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
            {lang === 'ar' ? 'المحادثة المباشرة' : 'Live Transcript'}
          </span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="max-h-48 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {entries.map((entry) => {
            const rtl = isArabic(entry.text);
            return (
              <div
                key={entry.id}
                className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    entry.role === 'user'
                      ? 'bg-brand-primary/20 text-white/90 rounded-br-md'
                      : 'bg-white/10 text-white/80 rounded-bl-md'
                  }`}
                  dir={rtl ? 'rtl' : 'ltr'}
                >
                  <span className="text-[10px] uppercase tracking-wider text-white/30 block mb-1">
                    {entry.role === 'user'
                      ? lang === 'ar'
                        ? 'أنت'
                        : 'You'
                      : 'Pyra'}
                  </span>
                  {entry.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

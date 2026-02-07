'use client';

interface HeaderProps {
  lang: 'en' | 'ar';
  onLanguageChange: (lang: 'en' | 'ar') => void;
}

export default function Header({ lang, onLanguageChange }: HeaderProps) {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-blue-500 flex items-center justify-center shadow-lg shadow-brand-primary/20">
          <span className="text-white font-bold text-lg">P</span>
        </div>
        <span className="text-white font-bold text-xl tracking-tight">
          Pyra<span className="text-brand-primary">media</span>
        </span>
      </div>

      {/* Language toggle */}
      <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10">
        <button
          onClick={() => onLanguageChange('ar')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            lang === 'ar'
              ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
              : 'text-white/60 hover:text-white'
          }`}
        >
          AR
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            lang === 'en'
              ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
              : 'text-white/60 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>
    </header>
  );
}

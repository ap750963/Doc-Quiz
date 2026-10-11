import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, BookOpen, BookmarkCheck, Sun, Moon } from 'lucide-react';
import { sound } from '../utils/sound';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: 'config' | 'quiz' | 'flashcards' | 'results' | 'history';
  onNavigateHome: () => void;
  onNavigateHistory: () => void;
  onOpenSaved: () => void;
  onOpenHowItWorks: () => void;
  savedCount: number;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateHome,
  onNavigateHistory,
  onOpenSaved,
  onOpenHowItWorks,
  savedCount,
  historyCount,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const { theme, toggleTheme } = useTheme();

  const handleToggleSound = () => {
    const updated = sound.toggleMute();
    setIsMuted(updated);
    if (!updated) {
      sound.playClick();
    }
  };

  const handleToggleTheme = () => {
    sound.playClick();
    toggleTheme();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single Brand Wordmark */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-indigo-500 rounded-lg p-1"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap shrink-0">
            Docu<span className="text-indigo-600 dark:text-indigo-400">Quiz</span>
          </span>
        </button>

        {/* Zone 2: Navigation Links (Single Line, 1-2 word labels) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={onNavigateHome}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentView === 'config'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Quiz Creator
          </button>
          <button
            onClick={onNavigateHistory}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
              currentView === 'history'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Quiz Records</span>
            {historyCount > 0 && (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">({historyCount})</span>
            )}
          </button>
          <button
            onClick={onOpenSaved}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
          >
            <span>Saved Quizzes</span>
            {savedCount > 0 && (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">({savedCount})</span>
            )}
          </button>
          <button
            onClick={onOpenHowItWorks}
            className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
          >
            How It Works
          </button>
        </nav>

        {/* Zone 3: Primary Action, Theme & Sound Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-indigo-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Sound Mute Toggle Button */}
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-indigo-500"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-slate-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          <button
            onClick={currentView !== 'config' ? onNavigateHome : onNavigateHistory}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {currentView !== 'config' ? 'New Quiz' : 'View Records'}
          </button>
        </div>
      </div>
    </header>
  );
};

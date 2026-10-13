import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuizConfigurator } from './components/QuizConfigurator';
import { QuizPlayer } from './components/QuizPlayer';
import { QuizResults } from './components/QuizResults';
import { FlashcardDeck } from './components/FlashcardDeck';
import { QuizHistory } from './components/QuizHistory';
import { SavedQuizzesModal } from './components/SavedQuizzesModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Quiz, QuizMode, QuizAttempt, Question } from './types/quiz';
import { sound } from './utils/sound';

export default function App() {
  const [currentView, setCurrentView] = useState<'config' | 'quiz' | 'flashcards' | 'results' | 'history'>('config');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeMode, setActiveMode] = useState<QuizMode>('practice');
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Saved quizzes library & attempt records
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([]);
  const [savedAttempts, setSavedAttempts] = useState<QuizAttempt[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Load saved quizzes & attempts on mount
  useEffect(() => {
    try {
      const storedQuizzes = localStorage.getItem('docuquiz_library');
      if (storedQuizzes) {
        setSavedQuizzes(JSON.parse(storedQuizzes));
      }
      const storedAttempts = localStorage.getItem('docuquiz_attempts');
      if (storedAttempts) {
        setSavedAttempts(JSON.parse(storedAttempts));
      }
    } catch {
      // Ignore
    }
  }, []);

  const refreshStorage = () => {
    try {
      const storedQuizzes = localStorage.getItem('docuquiz_library');
      if (storedQuizzes) {
        setSavedQuizzes(JSON.parse(storedQuizzes));
      }
      const storedAttempts = localStorage.getItem('docuquiz_attempts');
      if (storedAttempts) {
        setSavedAttempts(JSON.parse(storedAttempts));
      }
    } catch {
      // Ignore
    }
  };

  const handleQuizGenerated = (quiz: Quiz, mode: QuizMode) => {
    setActiveQuiz(quiz);
    setActiveMode(mode);
    refreshStorage();
    if (mode === 'flashcards') {
      setCurrentView('flashcards');
    } else {
      setCurrentView('quiz');
    }
  };

  const handleQuizComplete = (attempt: QuizAttempt) => {
    setLastAttempt(attempt);

    // Persist attempt into records history
    setSavedAttempts((prev) => {
      const updated = [attempt, ...prev.filter((a) => a.id !== attempt.id)].slice(0, 100);
      try {
        localStorage.setItem('docuquiz_attempts', JSON.stringify(updated));
      } catch {
        // Ignore quota error
      }
      return updated;
    });

    setCurrentView('results');
  };

  const handleRetakeAll = () => {
    sound.playClick();
    if (activeQuiz) {
      setCurrentView('quiz');
    }
  };

  const handleRetakeMissed = (missedQuestions: Question[]) => {
    sound.playClick();
    if (!activeQuiz || missedQuestions.length === 0) return;

    // Create targeted retry quiz
    const targetedQuiz: Quiz = {
      ...activeQuiz,
      id: 'retry_' + Date.now(),
      title: `${activeQuiz.title} (Focus Drill)`,
      questions: missedQuestions,
    };

    setActiveQuiz(targetedQuiz);
    setCurrentView('quiz');
  };

  const handleNewQuiz = () => {
    sound.playClick();
    setCurrentView('config');
  };

  const handleCreateMoreFromDoc = () => {
    sound.playClick();
    setCurrentView('config');
  };

  const handleOpenSaved = () => {
    sound.playClick();
    refreshStorage();
    setIsSavedModalOpen(true);
  };

  const handleSelectSavedQuiz = (quiz: Quiz, mode: QuizMode) => {
    setActiveQuiz(quiz);
    setActiveMode(mode);
    setIsSavedModalOpen(false);
    if (mode === 'flashcards') {
      setCurrentView('flashcards');
    } else {
      setCurrentView('quiz');
    }
  };

  const handleDeleteSavedQuiz = (quizId: string) => {
    const updated = savedQuizzes.filter((q) => q.id !== quizId);
    setSavedQuizzes(updated);
    try {
      localStorage.setItem('docuquiz_library', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Past Quiz History Handlers
  const handleRetakePastQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setActiveMode('practice');
    setCurrentView('quiz');
  };

  const handleRetakePastMissed = (quiz: Quiz, missedQuestions: Question[]) => {
    const targetedQuiz: Quiz = {
      ...quiz,
      id: 'retry_' + Date.now(),
      title: `${quiz.title} (Focus Drill)`,
      questions: missedQuestions,
    };
    setActiveQuiz(targetedQuiz);
    setActiveMode('practice');
    setCurrentView('quiz');
  };

  const handleStudyPastFlashcards = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentView('flashcards');
  };

  const handleDeleteAttempt = (attemptId: string) => {
    const updated = savedAttempts.filter((a) => a.id !== attemptId);
    setSavedAttempts(updated);
    try {
      localStorage.setItem('docuquiz_attempts', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleClearAllAttempts = () => {
    setSavedAttempts([]);
    try {
      localStorage.removeItem('docuquiz_attempts');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        currentView={currentView}
        onNavigateHome={() => {
          sound.playClick();
          setCurrentView('config');
        }}
        onNavigateHistory={() => {
          sound.playClick();
          refreshStorage();
          setCurrentView('history');
        }}
        onOpenSaved={handleOpenSaved}
        onOpenHowItWorks={() => {
          sound.playClick();
          setIsHowItWorksOpen(true);
        }}
        savedCount={savedQuizzes.length}
        historyCount={savedAttempts.length}
      />

      {/* Main View Container */}
      <main className="flex-1 pb-16">
        {currentView === 'config' && (
          <QuizConfigurator
            onQuizGenerated={handleQuizGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentView === 'history' && (
          <QuizHistory
            attempts={savedAttempts}
            onRetakeQuiz={handleRetakePastQuiz}
            onRetakeMissed={handleRetakePastMissed}
            onStudyFlashcards={handleStudyPastFlashcards}
            onDeleteAttempt={handleDeleteAttempt}
            onClearAllAttempts={handleClearAllAttempts}
            onCreateNewQuiz={() => {
              sound.playClick();
              setCurrentView('config');
            }}
          />
        )}

        {currentView === 'quiz' && activeQuiz && (
          <QuizPlayer
            quiz={activeQuiz}
            mode={activeMode}
            onCompleteQuiz={handleQuizComplete}
            onExitQuiz={() => {
              sound.playClick();
              setCurrentView('config');
            }}
          />
        )}

        {currentView === 'flashcards' && activeQuiz && (
          <FlashcardDeck
            quiz={activeQuiz}
            onExit={() => {
              sound.playClick();
              setCurrentView('config');
            }}
            onStartQuiz={() => {
              sound.playClick();
              setCurrentView('quiz');
            }}
          />
        )}

        {currentView === 'results' && activeQuiz && lastAttempt && (
          <QuizResults
            quiz={activeQuiz}
            attempt={lastAttempt}
            onRetakeAll={handleRetakeAll}
            onRetakeMissed={handleRetakeMissed}
            onNewQuiz={handleNewQuiz}
            onCreateMoreFromDoc={handleCreateMoreFromDoc}
            onRetakeWithMode={(mode) => {
              setActiveMode(mode);
              setCurrentView('quiz');
            }}
            onOpenFlashcards={() => {
              sound.playClick();
              setCurrentView('flashcards');
            }}
            onViewHistory={() => {
              sound.playClick();
              refreshStorage();
              setCurrentView('history');
            }}
          />
        )}
      </main>

      {/* Connectivity & Offline indicator */}
      <OfflineIndicator />

      {/* Modals */}
      <SavedQuizzesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        onSelectQuiz={handleSelectSavedQuiz}
        onDeleteQuiz={handleDeleteSavedQuiz}
        quizzes={savedQuizzes}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">DocuQuiz</span>
            <span className="mx-2">·</span>
            <span>AI-Powered Interactive Document Quiz Engine</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                sound.playClick();
                setCurrentView('history');
              }}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Quiz Records ({savedAttempts.length})
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setIsHowItWorksOpen(true);
              }}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Methodology
            </button>
            <button
              onClick={handleOpenSaved}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Saved Library ({savedQuizzes.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

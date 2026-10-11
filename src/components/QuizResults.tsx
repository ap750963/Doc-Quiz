import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Download,
  Flame,
  Clock,
  Layers,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Quiz, QuizAttempt, Question } from '../types/quiz';
import { triggerQuizCompletionConfetti } from '../utils/confetti';
import { sound } from '../utils/sound';

interface QuizResultsProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onRetakeAll: () => void;
  onRetakeMissed: (missedQuestions: Question[]) => void;
  onNewQuiz: () => void;
  onOpenFlashcards: () => void;
  onViewHistory?: () => void;
  onCreateMoreFromDoc?: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  quiz,
  attempt,
  onRetakeAll,
  onRetakeMissed,
  onNewQuiz,
  onOpenFlashcards,
  onViewHistory,
  onCreateMoreFromDoc,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'missed' | 'correct'>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    triggerQuizCompletionConfetti();
  }, []);

  const totalQuestions = quiz.questions.length;
  const correctCount = Object.values(attempt.answers).filter((a) => a.isCorrect).length;
  const missedCount = totalQuestions - correctCount;
  const accuracy = attempt.accuracyPercentage;

  const missedQuestions = quiz.questions.filter(
    (q) => attempt.answers[q.id] && !attempt.answers[q.id].isCorrect
  );

  const getRankInfo = () => {
    if (accuracy === 100) {
      return {
        title: 'Perfectionist!',
        emoji: '🏆',
        color: 'text-amber-500',
        message: 'Flawless execution! You have completely mastered this material.',
      };
    } else if (accuracy >= 80) {
      return {
        title: 'Quiz Champion!',
        emoji: '🌟',
        color: 'text-indigo-600',
        message: 'Outstanding performance! Deep conceptual grasp across the board.',
      };
    } else if (accuracy >= 60) {
      return {
        title: 'Solid Scholar!',
        emoji: '🚀',
        color: 'text-emerald-600',
        message: 'Great effort! A few key areas to review for complete mastery.',
      };
    } else {
      return {
        title: 'Keen Explorer!',
        emoji: '💡',
        color: 'text-violet-600',
        message: 'Valuable first pass! Use the study flashcards to solidify facts.',
      };
    }
  };

  const rank = getRankInfo();

  const handleExportMarkdown = () => {
    sound.playClick();
    let md = `# ${quiz.title}\n`;
    md += `**Topic:** ${quiz.topic} | **Difficulty:** ${quiz.difficulty.toUpperCase()}\n`;
    md += `**Score:** ${attempt.score} pts | **Accuracy:** ${accuracy}% (${correctCount}/${totalQuestions})\n\n`;
    md += `---\n\n`;

    quiz.questions.forEach((q, idx) => {
      const ans = attempt.answers[q.id];
      md += `### ${idx + 1}. ${q.question}\n`;
      md += `- **Type:** ${q.type}\n`;
      if (q.options.length > 0) {
        md += `- **Options:**\n`;
        q.options.forEach((opt) => (md += `  * ${opt}\n`));
      }
      md += `- **Correct Answer:** ${q.correctAnswer.join(', ')}\n`;
      md += `- **Your Answer:** ${ans ? ans.selectedAnswers.join(', ') : 'None'} (${ans?.isCorrect ? '✅ Correct' : '❌ Incorrect'})\n`;
      md += `- **Explanation:** ${q.explanation}\n`;
      if (q.sourceQuote) md += `- **Source Quote:** "${q.sourceQuote}"\n`;
      md += `\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${quiz.title.toLowerCase().replace(/\s+/g, '_')}_study_sheet.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = quiz.questions.filter((q) => {
    const isCorrect = attempt.answers[q.id]?.isCorrect;
    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'missed') return !isCorrect;
    return true;
  });

  const minutes = Math.floor(attempt.totalTimeSeconds / 60);
  const seconds = attempt.totalTimeSeconds % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop">
      {/* Header Trophy Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 text-center mb-8 relative overflow-hidden transition-colors">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-500" />

        <div className="text-5xl sm:text-6xl mb-3">{rank.emoji}</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
          {rank.title}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mt-2 max-w-lg mx-auto">
          {rank.message}
        </p>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Accuracy</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-display tabular-nums">
              {accuracy}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">
              {correctCount} / {totalQuestions} Correct
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Total Score</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-violet-600 dark:text-violet-400 font-display tabular-nums">
              {attempt.score.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">Points Earned</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Best Streak</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-display tabular-nums flex items-center justify-center gap-1">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span>{attempt.bestStreak}x</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">Combo Streak</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Time Spent</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display tabular-nums">
              {timeFormatted}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">Total Duration</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {missedCount > 0 && (
            <button
              onClick={() => onRetakeMissed(missedQuestions)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Missed Only ({missedCount})</span>
            </button>
          )}

          {onCreateMoreFromDoc && (
            <button
              onClick={onCreateMoreFromDoc}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/25 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>More Quizzes from Same Document</span>
            </button>
          )}

          <button
            onClick={onRetakeAll}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Full Quiz</span>
          </button>

          <button
            onClick={onOpenFlashcards}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Study Flashcards</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export Notes</span>
          </button>

          <button
            onClick={onNewQuiz}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
            <span>Create New Quiz</span>
          </button>

          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>All Records</span>
            </button>
          )}
        </div>
      </div>

      {/* Review Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Question Breakdown & Solutions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review your answers, correct solutions, and source citations.
            </p>
          </div>

          {/* Filter segment */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => {
                sound.playClick();
                setFilterMode('all');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({totalQuestions})
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setFilterMode('missed');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterMode === 'missed'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Missed ({missedCount})
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setFilterMode('correct');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filterMode === 'correct'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Correct ({correctCount})
            </button>
          </div>
        </div>

        {/* Filtered questions list */}
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const ans = attempt.answers[q.id];
            const isCorrect = ans?.isCorrect;
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-rose-200/70 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setExpandedQuestionId(isExpanded ? null : q.id);
                  }}
                  className="w-full p-4 flex items-start justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{q.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span className="capitalize">{q.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Expanded Question Details */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                          Your Answer:
                        </span>
                        <span
                          className={`font-bold ${
                            isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {ans ? ans.selectedAnswers.join(', ') || '(empty)' : 'No answer'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                          Correct Solution:
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {q.correctAnswer.join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Explanation:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
                      {q.sourceQuote && (
                        <p className="text-slate-500 dark:text-slate-400 italic mt-2 border-t border-slate-100 dark:border-slate-700 pt-1.5">
                          "{q.sourceQuote}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

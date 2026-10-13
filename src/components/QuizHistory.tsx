import React, { useState } from 'react';
import {
  History,
  Trophy,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Layers,
  Download,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuizAttempt, Quiz, Question } from '../types/quiz';
import { sound } from '../utils/sound';

interface QuizHistoryProps {
  attempts: QuizAttempt[];
  onRetakeQuiz: (quiz: Quiz) => void;
  onRetakeMissed: (quiz: Quiz, missedQuestions: Question[]) => void;
  onStudyFlashcards: (quiz: Quiz) => void;
  onDeleteAttempt: (attemptId: string) => void;
  onClearAllAttempts: () => void;
  onCreateNewQuiz: () => void;
}

export const QuizHistory: React.FC<QuizHistoryProps> = ({
  attempts,
  onRetakeQuiz,
  onRetakeMissed,
  onStudyFlashcards,
  onDeleteAttempt,
  onClearAllAttempts,
  onCreateNewQuiz,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'score' | 'accuracy'>('recent');
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Aggregated Stats
  const totalCompleted = attempts.length;
  const avgAccuracy = totalCompleted
    ? Math.round(
        attempts.reduce((acc, a) => acc + a.accuracyPercentage, 0) / totalCompleted
      )
    : 0;
  const highestScore = totalCompleted
    ? Math.max(...attempts.map((a) => a.score))
    : 0;
  const totalQuestionsAnswered = attempts.reduce(
    (acc, a) => acc + a.totalQuestions,
    0
  );
  const bestAllTimeStreak = totalCompleted
    ? Math.max(...attempts.map((a) => a.bestStreak))
    : 0;

  // Filter & Sort
  const filteredAttempts = attempts
    .filter((a) => {
      const matchSearch =
        a.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.quizTopic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiff =
        selectedDifficulty === 'all' || a.difficulty === selectedDifficulty;
      return matchSearch && matchDiff;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return b.completedAt - a.completedAt;
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'accuracy') return b.accuracyPercentage - a.accuracyPercentage;
      return 0;
    });

  const handleExportMarkdown = (attempt: QuizAttempt) => {
    sound.playClick();
    const quiz = attempt.quizSnapshot;
    if (!quiz) return;

    let md = `# ${attempt.quizTitle} - Attempt Record\n`;
    md += `**Date:** ${new Date(attempt.completedAt).toLocaleString()}\n`;
    md += `**Topic:** ${attempt.quizTopic} | **Difficulty:** ${attempt.difficulty.toUpperCase()} | **Mode:** ${attempt.mode}\n`;
    md += `**Score:** ${attempt.score} pts | **Accuracy:** ${attempt.accuracyPercentage}% (${attempt.totalQuestions} Questions)\n`;
    md += `**Best Streak:** ${attempt.bestStreak}x | **Duration:** ${Math.round(attempt.totalTimeSeconds)}s\n\n`;
    md += `---\n\n## Question Review\n\n`;

    quiz.questions.forEach((q, idx) => {
      const ans = attempt.answers[q.id];
      md += `### ${idx + 1}. ${q.question}\n`;
      if (q.options.length > 0) {
        md += `- **Options:** ${q.options.join(', ')}\n`;
      }
      md += `- **Correct Answer:** ${q.correctAnswer.join(', ')}\n`;
      md += `- **Your Answer:** ${ans ? ans.selectedAnswers.join(', ') : 'None'} (${ans?.isCorrect ? '✅ Correct' : '❌ Missed'})\n`;
      md += `- **Explanation:** ${q.explanation}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${attempt.quizTitle.toLowerCase().replace(/\s+/g, '_')}_record.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Past Quiz Records & Performance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">
            Quiz History & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Review past quiz scores, study missed questions, and track your conceptual growth.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalCompleted > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all quiz history records?')) {
                  sound.playClick();
                  onClearAllAttempts();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Clear Records
            </button>
          )}

          <button
            onClick={onCreateNewQuiz}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Quizzes</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-display tabular-nums">
            {totalCompleted}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Completed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Avg Accuracy</span>
          <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-display tabular-nums">
            {avgAccuracy}%
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Across all attempts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">High Score</span>
          <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 font-display tabular-nums">
            {highestScore.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Best record</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Questions Solved</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display tabular-nums">
            {totalQuestionsAnswered}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Total answered</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1 transition-colors">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Best Streak</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-display tabular-nums flex items-center gap-1">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>{bestAllTimeStreak}x</span>
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Consecutive</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past quizzes by title or topic..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {['all', 'easy', 'medium', 'hard', 'mixed'].map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  sound.playClick();
                  setSelectedDifficulty(diff);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="score">Highest Score</option>
            <option value="accuracy">Highest Accuracy</option>
          </select>
        </div>
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
            {attempts.length === 0 ? 'No Quiz Records Yet' : 'No matching records found'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
            {attempts.length === 0
              ? 'Complete your first interactive document quiz to automatically log your results, scores, and review cards here.'
              : 'Try clearing your search filters to view your past completed quizzes.'}
          </p>
          {attempts.length === 0 && (
            <button
              onClick={onCreateNewQuiz}
              className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Take Your First Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttempts.map((attempt) => {
            const isExpanded = expandedAttemptId === attempt.id;
            const quiz = attempt.quizSnapshot;
            const missedQuestions = quiz
              ? quiz.questions.filter(
                  (q) => attempt.answers[q.id] && !attempt.answers[q.id].isCorrect
                )
              : [];
            const correctCount = Object.values(attempt.answers).filter((a) => a.isCorrect).length;
            const dateStr = new Date(attempt.completedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const minutes = Math.floor(attempt.totalTimeSeconds / 60);
            const seconds = attempt.totalTimeSeconds % 60;
            const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

            return (
              <div
                key={attempt.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs overflow-hidden"
              >
                {/* Main Attempt Header Strip */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                        {attempt.quizTopic}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {attempt.difficulty} Difficulty
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {attempt.mode} Mode
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{dateStr}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                      {attempt.quizTitle}
                    </h3>

                    {/* Stats pills */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                      <span className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {attempt.accuracyPercentage}% Accuracy
                        </span>{' '}
                        ({correctCount}/{attempt.totalQuestions})
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {attempt.score.toLocaleString()} Points
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {attempt.bestStreak}x Streak
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {timeFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Actions for this Attempt */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setExpandedAttemptId(isExpanded ? null : attempt.id);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Review' : 'Inspect Review'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {quiz && (
                      <>
                        <button
                          onClick={() => {
                            sound.playClick();
                            onRetakeQuiz(quiz);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          title="Replay this quiz"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </button>

                        {missedQuestions.length > 0 && (
                          <button
                            onClick={() => {
                              sound.playClick();
                              onRetakeMissed(quiz, missedQuestions);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                            title="Practice only missed questions"
                          >
                            <span>Retake Missed ({missedQuestions.length})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            sound.playClick();
                            onStudyFlashcards(quiz);
                          }}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                          title="Study Flashcards"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        </button>

                        <button
                          onClick={() => handleExportMarkdown(attempt)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                          title="Export study notes"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        sound.playClick();
                        onDeleteAttempt(attempt.id);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Question Review Panel */}
                <AnimatePresence>
                  {isExpanded && quiz && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-950/50 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Question Review ({quiz.questions.length} Questions)
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {correctCount} Correct · {missedQuestions.length} Missed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {quiz.questions.map((q, qIdx) => {
                          const ans = attempt.answers[q.id];
                          const isCorrect = ans?.isCorrect;

                          return (
                            <div
                              key={q.id}
                              className={`p-3.5 rounded-xl border text-xs ${
                                isCorrect
                                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-800'
                                  : 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="font-bold text-slate-900 dark:text-white leading-snug">
                                  {qIdx + 1}. {q.question}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  {isCorrect ? 'Correct' : 'Missed'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                  <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                                    Your Answer:
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                    }`}
                                  >
                                    {ans
                                      ? ans.selectedAnswers.join(', ') || '(empty)'
                                      : 'None'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                                    Correct Solution:
                                  </span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    {q.correctAnswer.join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

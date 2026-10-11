import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Lightbulb,
  Check,
  ChevronRight,
  MessageSquare,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz, Question, QuizMode, UserAnswerRecord, QuizAttempt } from '../types/quiz';
import { sound } from '../utils/sound';
import { triggerStreakConfetti } from '../utils/confetti';

interface QuizPlayerProps {
  quiz: Quiz;
  mode: QuizMode;
  onCompleteQuiz: (attempt: QuizAttempt) => void;
  onExitQuiz: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  quiz,
  mode,
  onCompleteQuiz,
  onExitQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [fillBlankText, setFillBlankText] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [deepExplanation, setDeepExplanation] = useState<string | null>(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);

  // Scoring and Streak
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Per-question tracking
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswerRecord>>({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [totalQuizStartTime] = useState(Date.now());

  // Arcade timer
  const ARCADE_TIME_PER_QUESTION = 30;
  const [timeLeft, setTimeLeft] = useState(ARCADE_TIME_PER_QUESTION);

  const currentQ: Question = quiz.questions[currentIndex] || quiz.questions[0];
  const isArcade = mode === 'arcade';

  // Timer effect for Arcade mode
  useEffect(() => {
    if (!isArcade || isAnswerSubmitted) return;

    setTimeLeft(ARCADE_TIME_PER_QUESTION);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 5 && prev > 1) {
          sound.playTick();
        }
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isArcade, isAnswerSubmitted]);

  // Reset question state when index changes
  useEffect(() => {
    setSelectedAnswers([]);
    setFillBlankText('');
    setIsAnswerSubmitted(false);
    setShowHint(false);
    setDeepExplanation(null);
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const handleSelectOption = (option: string) => {
    if (isAnswerSubmitted) return;
    sound.playClick();

    if (currentQ.type === 'multiple_answer') {
      setSelectedAnswers((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      );
    } else {
      setSelectedAnswers([option]);
    }
  };

  const handleAutoSubmitTimeout = () => {
    if (isAnswerSubmitted) return;
    handleSubmitAnswer([]);
  };

  const handleSubmitAnswer = (forcedAnswers?: string[]) => {
    if (isAnswerSubmitted) return;

    const answersToEval =
      forcedAnswers !== undefined
        ? forcedAnswers
        : currentQ.type === 'fill_blank'
        ? [fillBlankText.trim()]
        : selectedAnswers;

    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));

    // Evaluate correctness
    let isCorrect = false;

    if (currentQ.type === 'fill_blank') {
      const userText = (answersToEval[0] || '').trim().toLowerCase();
      isCorrect = currentQ.correctAnswer.some(
        (ans) => ans.trim().toLowerCase() === userText
      );
    } else if (currentQ.type === 'multiple_answer') {
      // Must match all correct answers exactly
      const sortedUser = [...answersToEval].sort();
      const sortedCorrect = [...currentQ.correctAnswer].sort();
      isCorrect =
        sortedUser.length === sortedCorrect.length &&
        sortedUser.every((val, idx) => val === sortedCorrect[idx]);
    } else {
      // Multiple choice or true/false
      isCorrect =
        answersToEval.length > 0 &&
        answersToEval[0].trim().toLowerCase() ===
          currentQ.correctAnswer[0]?.trim().toLowerCase();
    }

    // Point scoring calculation
    let earnedPoints = 0;
    if (isCorrect) {
      sound.playCorrect();
      const basePoints = currentQ.difficulty === 'hard' ? 150 : currentQ.difficulty === 'medium' ? 100 : 75;
      const speedBonus = isArcade ? Math.max(0, timeLeft * 3) : 0;
      const streakBonus = streak >= 2 ? streak * 25 : 0;
      earnedPoints = basePoints + speedBonus + streakBonus;

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setScore((prev) => prev + earnedPoints);

      if (newStreak >= 3) {
        sound.playStreak();
        triggerStreakConfetti();
      }
    } else {
      sound.playIncorrect();
      setStreak(0);
    }

    // Record answer
    const record: UserAnswerRecord = {
      questionId: currentQ.id,
      selectedAnswers: answersToEval,
      isCorrect,
      timeSpentSeconds: timeSpent,
      hintUsed: showHint,
    };

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: record,
    }));

    setIsAnswerSubmitted(true);
  };

  const handleNext = () => {
    sound.playClick();
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Complete Quiz!
      sound.playFanfare();
      const totalTime = Math.max(1, Math.round((Date.now() - totalQuizStartTime) / 1000));
      const answersList = Object.values(userAnswers);
      const correctCount = answersList.filter((a) => a.isCorrect).length;
      const accuracy = Math.round((correctCount / quiz.questions.length) * 100);

      const attempt: QuizAttempt = {
        id: 'attempt_' + Date.now(),
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizTopic: quiz.topic,
        difficulty: quiz.difficulty,
        mode,
        completedAt: Date.now(),
        score,
        totalQuestions: quiz.questions.length,
        accuracyPercentage: accuracy,
        bestStreak,
        totalTimeSeconds: totalTime,
        answers: userAnswers,
        quizSnapshot: quiz,
      };

      onCompleteQuiz(attempt);
    }
  };

  const handleAskAICoach = async () => {
    if (deepExplanation || isLoadingDeepDive) return;
    sound.playClick();
    setIsLoadingDeepDive(true);

    try {
      const userAnswerStr =
        currentQ.type === 'fill_blank'
          ? fillBlankText || '(blank)'
          : selectedAnswers.join(', ') || '(no answer)';

      const res = await fetch('/api/explain-deeply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          userAnswer: userAnswerStr,
          correctAnswer: currentQ.correctAnswer.join(', '),
          explanation: currentQ.explanation,
          context: currentQ.sourceQuote || quiz.summary,
        }),
      });

      const data = await res.json();
      if (data && data.success && data.explanation) {
        setDeepExplanation(data.explanation);
      } else {
        setDeepExplanation(`1. The Core Concept: The correct solution relies on "${currentQ.correctAnswer.join(', ')}".\n2. Why Confusion Happens: Plausible distractors often sound similar.\n3. Pro Memory Trick: ${currentQ.explanation}`);
      }
    } catch (err) {
      console.warn('AI Coach fetch fallback:', err);
      setDeepExplanation(`1. The Core Concept: The correct answer is "${currentQ.correctAnswer.join(', ')}".\n2. Why Confusion Happens: Subtleties in phrasing can easily create confusion.\n3. Pro Memory Trick: Remember: ${currentQ.explanation}`);
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const progressPercentage = ((currentIndex + 1) / quiz.questions.length) * 100;
  const currentRecord = userAnswers[currentQ.id];
  const canSubmit =
    currentQ.type === 'fill_blank'
      ? fillBlankText.trim().length > 0
      : selectedAnswers.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Bar with Exit and Quiz Title */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onExitQuiz}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Exit Quiz</span>
        </button>

        <div className="text-center min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate font-display">
            {quiz.title}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {quiz.topic} · {quiz.difficulty.toUpperCase()}
          </span>
        </div>

        {/* Live HUD: Streak & Score */}
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>{streak}x Streak</span>
            </motion.div>
          )}

          <div className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold tabular-nums">
            {score.toLocaleString()} pts
          </div>
        </div>
      </div>

      {/* Progress Tracker Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 mb-6 transition-colors">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
          <span>
            Question <span className="text-indigo-600 dark:text-indigo-400">{currentIndex + 1}</span> of{' '}
            {quiz.questions.length}
          </span>
          {isArcade && (
            <div
              className={`flex items-center gap-1 font-mono font-bold ${
                timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s remaining</span>
            </div>
          )}
        </div>

        {/* Smooth animated progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mb-3">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Interactive Question Step Navigator */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
          {quiz.questions.map((q, idx) => {
            const record = userAnswers[q.id];
            const isCurrent = idx === currentIndex;
            const isDone = record !== undefined;
            const isCorrect = record?.isCorrect;

            let badgeStyle = 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80';
            if (isCurrent) {
              badgeStyle = 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/30';
            } else if (isDone && isCorrect) {
              badgeStyle = 'border-emerald-500 bg-emerald-500 text-white';
            } else if (isDone && !isCorrect) {
              badgeStyle = 'border-rose-500 bg-rose-500 text-white';
            }

            return (
              <button
                key={q.id}
                type="button"
                disabled={!isAnswerSubmitted && idx > currentIndex}
                onClick={() => {
                  if (isAnswerSubmitted || idx <= currentIndex) {
                    sound.playClick();
                    setCurrentIndex(idx);
                  }
                }}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-all shrink-0 cursor-pointer ${badgeStyle}`}
                title={`Question ${idx + 1}`}
              >
                {isDone ? (
                  isCorrect ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="text-[10px] font-bold">✕</span>
                  )
                ) : (
                  idx + 1
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <motion.div
        key={currentQ.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 transition-colors"
      >
        {/* Meta badges: Question Type & Difficulty */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {currentQ.type === 'multiple_choice'
                ? 'Multiple Choice'
                : currentQ.type === 'true_false'
                ? 'True / False'
                : currentQ.type === 'multiple_answer'
                ? 'Multiple Answer'
                : 'Fill in Blank'}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                currentQ.difficulty === 'easy'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : currentQ.difficulty === 'medium'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
              }`}
            >
              {currentQ.difficulty.toUpperCase()}
            </span>
          </div>

          {/* Hint button */}
          {!isAnswerSubmitted && currentQ.hint && (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowHint(!showHint);
              }}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
            </button>
          )}
        </div>

        {/* Clue / Hint Box */}
        <AnimatePresence>
          {showHint && !isAnswerSubmitted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2"
            >
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Clue: </span>
                {currentQ.hint}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Prompt */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-6 font-display">
          {currentQ.question}
        </h3>

        {/* Multiple Choice / Multiple Answer Options */}
        {(currentQ.type === 'multiple_choice' || currentQ.type === 'multiple_answer') && (
          <div className="space-y-3 mb-6">
            {currentQ.type === 'multiple_answer' && !isAnswerSubmitted && (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                * Select all correct options that apply
              </p>
            )}

            {currentQ.options.map((option, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isSelected = selectedAnswers.includes(option);
              const isCorrectOpt = currentQ.correctAnswer.includes(option);

              let optionStyle = 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/40';
              let badgeStyle = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-700 dark:group-hover:text-indigo-300';

              if (!isAnswerSubmitted) {
                if (isSelected) {
                  optionStyle = 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20';
                  badgeStyle = 'bg-indigo-600 text-white';
                }
              } else {
                // Post-submission styling
                if (isCorrectOpt) {
                  optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500';
                  badgeStyle = 'bg-emerald-600 text-white';
                } else if (isSelected && !isCorrectOpt) {
                  optionStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400 opacity-80';
                  badgeStyle = 'bg-rose-600 text-white';
                } else {
                  optionStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-40 text-slate-500 dark:text-slate-400';
                  badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectOption(option)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer group ${optionStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                  >
                    {isAnswerSubmitted && isCorrectOpt ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      letter
                    )}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed flex-1">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* True / False Options */}
        {currentQ.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {['True', 'False'].map((choice) => {
              const isSelected = selectedAnswers.includes(choice);
              const isCorrectOpt = currentQ.correctAnswer[0]?.toLowerCase() === choice.toLowerCase();

              let btnStyle = 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40';

              if (!isAnswerSubmitted) {
                if (isSelected) {
                  btnStyle = 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-bold';
                }
              } else {
                if (isCorrectOpt) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-500';
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400 opacity-70';
                } else {
                  btnStyle = 'border-slate-200 dark:border-slate-800 opacity-30 text-slate-400';
                }
              }

              return (
                <button
                  key={choice}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectOption(choice)}
                  className={`p-6 rounded-2xl border text-center font-display text-lg font-bold transition-all cursor-pointer ${btnStyle}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in Blank Option */}
        {currentQ.type === 'fill_blank' && (
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                disabled={isAnswerSubmitted}
                value={fillBlankText}
                onChange={(e) => setFillBlankText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit && !isAnswerSubmitted) {
                    handleSubmitAnswer();
                  }
                }}
                placeholder="Type your answer here..."
                className={`w-full p-4 rounded-xl border text-base font-medium outline-none transition-all ${
                  isAnswerSubmitted
                    ? currentRecord?.isCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100'
                      : 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40'
                }`}
                autoFocus
              />
            </div>
            {isAnswerSubmitted && (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2">
                Accepted answer(s):{' '}
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {currentQ.correctAnswer.join(', ')}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Submit or Next Action Button */}
        {!isAnswerSubmitted ? (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleSubmitAnswer()}
              className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                canSubmit
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-98'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Confirm Answer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* Post-Submission Feedback Banner */}
        <AnimatePresence>
          {isAnswerSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800"
            >
              {/* Correct / Incorrect Header Banner */}
              <div
                className={`p-4 rounded-xl flex items-center justify-between gap-3 mb-4 ${
                  currentRecord?.isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {currentRecord?.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold">
                      {currentRecord?.isCorrect
                        ? 'Brilliant! Correct Answer'
                        : 'Not Quite Right'}
                    </p>
                    <p className="text-xs opacity-80">
                      {currentRecord?.isCorrect
                        ? currentRecord.timeSpentSeconds <= 5
                          ? 'Lightning fast! High speed bonus points.'
                          : 'Well reasoned knowledge recall.'
                        : `Correct answer: ${currentQ.correctAnswer.join(', ')}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>
                    {currentIndex < quiz.questions.length - 1
                      ? 'Next Question'
                      : 'View Results'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Explanatory Didactic Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Why this is correct:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{currentQ.explanation}</p>

                {currentQ.sourceQuote && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 italic">
                    <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">
                      From Document:
                    </span>{' '}
                    "{currentQ.sourceQuote}"
                  </div>
                )}
              </div>

              {/* Deep Dive AI Tutor Accordion */}
              {!deepExplanation ? (
                <button
                  type="button"
                  disabled={isLoadingDeepDive}
                  onClick={handleAskAICoach}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer py-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isLoadingDeepDive
                      ? 'AI Coach is crafting an intuitive analogy...'
                      : 'Ask AI Coach for Deep Intuition & Memory Trick'}
                  </span>
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 dark:from-indigo-950/50 dark:to-violet-950/50 border border-indigo-200 dark:border-indigo-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>AI Coach Intuition & Memory Trick</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {deepExplanation}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

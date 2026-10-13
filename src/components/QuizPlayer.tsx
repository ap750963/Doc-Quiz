import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Flame,
  Clock,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  Check,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Send,
  AlertCircle,
  HelpCircle,
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
  const isExam = mode === 'exam';
  const isArcade = mode === 'arcade';

  const [currentIndex, setCurrentIndex] = useState(0);

  // Practice & Arcade Mode State
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [fillBlankText, setFillBlankText] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Scoring and Streak (for Practice & Arcade)
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Per-question tracking (Practice & Arcade)
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswerRecord>>({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [totalQuizStartTime] = useState(Date.now());

  // Arcade timer
  const ARCADE_TIME_PER_QUESTION = 30;
  const [timeLeft, setTimeLeft] = useState(ARCADE_TIME_PER_QUESTION);

  // Exam Mode State: Answers & score revealed at the end
  const [examAnswers, setExamAnswers] = useState<Record<string, string[]>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [examElapsedSeconds, setExamElapsedSeconds] = useState(0);

  const currentQ: Question = quiz.questions[currentIndex] || quiz.questions[0];

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

  // Elapsed timer for Exam mode
  useEffect(() => {
    if (!isExam) return;
    const interval = setInterval(() => {
      setExamElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isExam]);

  // Reset practice question state when index changes
  useEffect(() => {
    if (!isExam) {
      setSelectedAnswers([]);
      setFillBlankText('');
      setIsAnswerSubmitted(false);
      setShowHint(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, isExam]);

  // ================= EXAM MODE ACTIONS =================
  const currentExamSelection = examAnswers[currentQ.id] || [];
  const currentExamFillText = currentExamSelection[0] || '';

  const handleSelectExamOption = (option: string) => {
    sound.playClick();
    if (currentQ.type === 'multiple_answer') {
      setExamAnswers((prev) => {
        const current = prev[currentQ.id] || [];
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [currentQ.id]: next };
      });
    } else {
      setExamAnswers((prev) => ({
        ...prev,
        [currentQ.id]: [option],
      }));
    }
  };

  const handleExamFillChange = (text: string) => {
    setExamAnswers((prev) => ({
      ...prev,
      [currentQ.id]: text.trim() ? [text] : [],
    }));
  };

  const handleToggleFlag = (qId: string) => {
    sound.playClick();
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleClearExamAnswer = () => {
    sound.playClick();
    setExamAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const answeredExamCount = quiz.questions.filter(
    (q) => (examAnswers[q.id] || []).length > 0
  ).length;
  const unansweredExamCount = quiz.questions.length - answeredExamCount;

  const handleFinalizeExam = () => {
    setShowSubmitConfirmModal(false);
    let totalScore = 0;
    let currentStreakCounter = 0;
    let maxStreakCounter = 0;
    let correctCount = 0;
    const evaluatedAnswers: Record<string, UserAnswerRecord> = {};

    quiz.questions.forEach((q) => {
      const userSelected = examAnswers[q.id] || [];
      let isCorrect = false;

      if (q.type === 'fill_blank') {
        const userText = (userSelected[0] || '').trim().toLowerCase();
        isCorrect = q.correctAnswer.some(
          (ans) => ans.trim().toLowerCase() === userText
        );
      } else if (q.type === 'multiple_answer') {
        const sortedUser = [...userSelected].sort();
        const sortedCorrect = [...q.correctAnswer].sort();
        isCorrect =
          sortedUser.length === sortedCorrect.length &&
          sortedUser.every((val, idx) => val === sortedCorrect[idx]);
      } else {
        isCorrect =
          userSelected.length > 0 &&
          userSelected[0].trim().toLowerCase() ===
            q.correctAnswer[0]?.trim().toLowerCase();
      }

      if (isCorrect) {
        correctCount++;
        const basePoints =
          q.difficulty === 'hard' ? 150 : q.difficulty === 'medium' ? 100 : 75;
        totalScore += basePoints;
        currentStreakCounter++;
        if (currentStreakCounter > maxStreakCounter) {
          maxStreakCounter = currentStreakCounter;
        }
      } else {
        currentStreakCounter = 0;
      }

      evaluatedAnswers[q.id] = {
        questionId: q.id,
        selectedAnswers: userSelected,
        isCorrect,
        timeSpentSeconds: Math.max(
          1,
          Math.round(examElapsedSeconds / quiz.questions.length)
        ),
        hintUsed: false,
      };
    });

    const totalTime = Math.max(1, examElapsedSeconds);
    const accuracy = Math.round((correctCount / quiz.questions.length) * 100);

    const attempt: QuizAttempt = {
      id: 'attempt_' + Date.now(),
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizTopic: quiz.topic,
      difficulty: quiz.difficulty,
      mode: 'exam',
      completedAt: Date.now(),
      score: totalScore,
      totalQuestions: quiz.questions.length,
      accuracyPercentage: accuracy,
      bestStreak: maxStreakCounter,
      totalTimeSeconds: totalTime,
      answers: evaluatedAnswers,
      quizSnapshot: quiz,
    };

    sound.playFanfare();
    onCompleteQuiz(attempt);
  };

  const handleJumpToFirstUnanswered = () => {
    setShowSubmitConfirmModal(false);
    const firstUnansweredIdx = quiz.questions.findIndex(
      (q) => !(examAnswers[q.id] && examAnswers[q.id].length > 0)
    );
    if (firstUnansweredIdx !== -1) {
      setCurrentIndex(firstUnansweredIdx);
    }
  };

  // ================= PRACTICE / ARCADE ACTIONS =================
  const handleSelectPracticeOption = (option: string) => {
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

    let isCorrect = false;

    if (currentQ.type === 'fill_blank') {
      const userText = (answersToEval[0] || '').trim().toLowerCase();
      isCorrect = currentQ.correctAnswer.some(
        (ans) => ans.trim().toLowerCase() === userText
      );
    } else if (currentQ.type === 'multiple_answer') {
      const sortedUser = [...answersToEval].sort();
      const sortedCorrect = [...currentQ.correctAnswer].sort();
      isCorrect =
        sortedUser.length === sortedCorrect.length &&
        sortedUser.every((val, idx) => val === sortedCorrect[idx]);
    } else {
      isCorrect =
        answersToEval.length > 0 &&
        answersToEval[0].trim().toLowerCase() ===
          currentQ.correctAnswer[0]?.trim().toLowerCase();
    }

    let earnedPoints = 0;
    if (isCorrect) {
      sound.playCorrect();
      const basePoints =
        currentQ.difficulty === 'hard' ? 150 : currentQ.difficulty === 'medium' ? 100 : 75;
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

  const handleNextPractice = () => {
    sound.playClick();
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
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

  const progressPercentage = ((currentIndex + 1) / quiz.questions.length) * 100;
  const currentRecord = userAnswers[currentQ.id];
  const canSubmitPractice =
    currentQ.type === 'fill_blank'
      ? fillBlankText.trim().length > 0
      : selectedAnswers.length > 0;

  // Format elapsed time string
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Bar with Exit and Quiz Title */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <button
          onClick={onExitQuiz}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="text-center min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate font-display">
            {quiz.title}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {quiz.topic} · {quiz.difficulty.toUpperCase()}
          </span>
        </div>

        {/* Live HUD */}
        {isExam ? (
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTime(examElapsedSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Submit Exam & Reveal Score"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Submit Exam</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* Progress Tracker Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 mb-6 transition-colors">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span>
              Question <span className="text-indigo-600 dark:text-indigo-400">{currentIndex + 1}</span> of{' '}
              {quiz.questions.length}
            </span>
            {isExam && (
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {answeredExamCount}/{quiz.questions.length} Answered · Answers Revealed at End
              </span>
            )}
          </div>

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
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
          {quiz.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;

            if (isExam) {
              const isAnswered = (examAnswers[q.id] || []).length > 0;
              const isFlagged = flaggedQuestions[q.id];

              let badgeStyle =
                'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 hover:border-slate-300';
              if (isCurrent) {
                badgeStyle =
                  'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 font-bold';
              } else if (isAnswered) {
                badgeStyle =
                  'border-indigo-500 bg-indigo-600 dark:bg-indigo-600 text-white font-bold';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setCurrentIndex(idx);
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-semibold flex items-center justify-center border transition-all shrink-0 cursor-pointer relative ${badgeStyle}`}
                  title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ' (Unanswered)'}${isFlagged ? ' - Flagged for review' : ''}`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            }

            // Practice / Arcade navigator
            const record = userAnswers[q.id];
            const isDone = record !== undefined;
            const isCorrect = record?.isCorrect;

            let badgeStyle =
              'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80';
            if (isCurrent) {
              badgeStyle =
                'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400/30';
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
        {/* Meta badges */}
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
            {isExam && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                Exam Mode
              </span>
            )}
          </div>

          {/* Exam Mode: Flag Toggle & Clear; Practice Mode: Hint */}
          {isExam ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  flaggedQuestions[currentQ.id]
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${flaggedQuestions[currentQ.id] ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
              </button>

              {currentExamSelection.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearExamAnswer}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer py-1"
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            !isAnswerSubmitted &&
            currentQ.hint && (
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
            )
          )}
        </div>

        {/* Practice Clue / Hint Box */}
        <AnimatePresence>
          {!isExam && showHint && !isAnswerSubmitted && (
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
            {currentQ.type === 'multiple_answer' && (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                * Select all correct options that apply
              </p>
            )}

            {currentQ.options.map((option, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);

              if (isExam) {
                const isSelected = currentExamSelection.includes(option);
                let optionStyle =
                  'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/40';
                let badgeStyle =
                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-700 dark:group-hover:text-indigo-300';

                if (isSelected) {
                  optionStyle =
                    'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-medium';
                  badgeStyle = 'bg-indigo-600 text-white';
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectExamOption(option)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer group ${optionStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                    >
                      {letter}
                    </span>
                    <span className="text-sm sm:text-base leading-relaxed flex-1">
                      {option}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              }

              // Practice / Arcade mode options
              const isSelected = selectedAnswers.includes(option);
              const isCorrectOpt = currentQ.correctAnswer.includes(option);

              let optionStyle =
                'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/40';
              let badgeStyle =
                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-700 dark:group-hover:text-indigo-300';

              if (!isAnswerSubmitted) {
                if (isSelected) {
                  optionStyle =
                    'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20';
                  badgeStyle = 'bg-indigo-600 text-white';
                }
              } else {
                if (isCorrectOpt) {
                  optionStyle =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500';
                  badgeStyle = 'bg-emerald-600 text-white';
                } else if (isSelected && !isCorrectOpt) {
                  optionStyle =
                    'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400 opacity-80';
                  badgeStyle = 'bg-rose-600 text-white';
                } else {
                  optionStyle =
                    'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-40 text-slate-500 dark:text-slate-400';
                  badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectPracticeOption(option)}
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
              if (isExam) {
                const isSelected = currentExamSelection.includes(choice);
                let btnStyle =
                  'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40';
                if (isSelected) {
                  btnStyle =
                    'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-bold';
                }

                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleSelectExamOption(choice)}
                    className={`p-6 rounded-2xl border text-center font-display text-lg font-bold transition-all cursor-pointer ${btnStyle}`}
                  >
                    {choice}
                  </button>
                );
              }

              // Practice mode True/False
              const isSelected = selectedAnswers.includes(choice);
              const isCorrectOpt =
                currentQ.correctAnswer[0]?.toLowerCase() === choice.toLowerCase();

              let btnStyle =
                'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/40';

              if (!isAnswerSubmitted) {
                if (isSelected) {
                  btnStyle =
                    'border-indigo-600 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-bold';
                }
              } else {
                if (isCorrectOpt) {
                  btnStyle =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold ring-2 ring-emerald-500';
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle =
                    'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400 opacity-70';
                } else {
                  btnStyle = 'border-slate-200 dark:border-slate-800 opacity-30 text-slate-400';
                }
              }

              return (
                <button
                  key={choice}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectPracticeOption(choice)}
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
                disabled={!isExam && isAnswerSubmitted}
                value={isExam ? currentExamFillText : fillBlankText}
                onChange={(e) => {
                  if (isExam) {
                    handleExamFillChange(e.target.value);
                  } else {
                    setFillBlankText(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isExam) {
                      if (currentIndex < quiz.questions.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                      }
                    } else if (canSubmitPractice && !isAnswerSubmitted) {
                      handleSubmitAnswer();
                    }
                  }
                }}
                placeholder="Type your answer here..."
                className={`w-full p-4 rounded-xl border text-base font-medium outline-none transition-all ${
                  isExam
                    ? currentExamFillText.trim()
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 text-slate-900 dark:text-white ring-1 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40'
                    : isAnswerSubmitted
                    ? currentRecord?.isCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100'
                      : 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40'
                }`}
                autoFocus
              />
            </div>
            {!isExam && isAnswerSubmitted && (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2">
                Accepted answer(s):{' '}
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {currentQ.correctAnswer.join(', ')}
                </span>
              </p>
            )}
          </div>
        )}

        {/* ================= NAVIGATION & ACTIONS ================= */}
        {isExam ? (
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => {
                sound.playClick();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
              {currentExamSelection.length > 0 ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  ✓ Recorded
                </span>
              ) : (
                <span>Not answered yet</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentIndex < quiz.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setCurrentIndex((prev) => prev + 1);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirmModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Submit & Reveal Results</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Practice / Arcade Actions */
          !isAnswerSubmitted && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canSubmitPractice}
                onClick={() => handleSubmitAnswer()}
                className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  canSubmitPractice
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-98'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Confirm Answer</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )
        )}

        {/* Practice / Arcade Post-Submission Feedback Banner */}
        <AnimatePresence>
          {!isExam && isAnswerSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800"
            >
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
                  onClick={handleNextPractice}
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

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Exam Mode Submission Confirmation Modal */}
      <AnimatePresence>
        {isExam && showSubmitConfirmModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Submit Exam & Reveal Score?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your answers and complete score will be revealed.
                  </p>
                </div>
              </div>

              {/* Status summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Questions:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{quiz.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Questions Answered:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{answeredExamCount}</span>
                </div>
                {unansweredExamCount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                    <span>Unanswered Questions:</span>
                    <span>{unansweredExamCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Elapsed Time:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatTime(examElapsedSeconds)}</span>
                </div>
              </div>

              {unansweredExamCount > 0 && (
                <div className="p-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    You have <span className="font-bold">{unansweredExamCount}</span> unanswered question(s). Unanswered questions will receive zero points.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {unansweredExamCount > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={handleJumpToFirstUnanswered}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Review Unanswered
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeExam}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      Submit Anyway & Reveal
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowSubmitConfirmModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back to Questions
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeExam}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      Reveal Answers & Score
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

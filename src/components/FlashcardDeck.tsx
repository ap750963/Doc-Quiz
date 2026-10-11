import React, { useState } from 'react';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Bookmark,
  Sparkles,
  Lightbulb,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz, Question } from '../types/quiz';
import { sound } from '../utils/sound';

interface FlashcardDeckProps {
  quiz: Quiz;
  onExit: () => void;
  onStartQuiz: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  quiz,
  onExit,
  onStartQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);

  const currentQ: Question = quiz.questions[currentIndex] || quiz.questions[0];

  const handleFlip = () => {
    sound.playClick();
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      sound.playClick();
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      sound.playClick();
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const toggleMastered = (id: string) => {
    sound.playClick();
    if (masteredIds.includes(id)) {
      setMasteredIds((prev) => prev.filter((i) => i !== id));
    } else {
      setMasteredIds((prev) => [...prev, id]);
      setReviewIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const toggleReview = (id: string) => {
    sound.playClick();
    if (reviewIds.includes(id)) {
      setReviewIds((prev) => prev.filter((i) => i !== id));
    } else {
      setReviewIds((prev) => [...prev, id]);
      setMasteredIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const isMastered = masteredIds.includes(currentQ.id);
  const isReview = reviewIds.includes(currentQ.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onExit}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer py-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Back to Quiz</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Card {currentIndex + 1} of {quiz.questions.length}
          </span>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {masteredIds.length} Mastered · {reviewIds.length} Review
          </p>
        </div>

        <button
          onClick={onStartQuiz}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <span>Take Quiz</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* 3D Flipping Flashcard */}
      <div
        className="w-full h-96 [perspective:1000px] cursor-pointer mb-6"
        onClick={handleFlip}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full h-full relative [transform-style:preserve-3d]"
        >
          {/* Front of Card (Question) */}
          <div className="absolute inset-0 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/60 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between [backface-visibility:hidden] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {currentQ.type.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Click card to flip
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display leading-snug">
                {currentQ.question}
              </h3>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="capitalize">{currentQ.difficulty} Difficulty</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <span>Reveal Answer</span>
                <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Back of Card (Answer & Explanation) */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-8 shadow-xl shadow-indigo-950/30 border border-indigo-700/80 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Correct Answer
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Click card to flip back
              </span>
            </div>

            <div className="my-auto text-center px-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white mb-3 font-display">
                {currentQ.correctAnswer.join(', ')}
              </div>
              <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-lg mx-auto">
                {currentQ.explanation}
              </p>
            </div>

            <div className="text-xs text-slate-400 border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="truncate max-w-[200px] text-slate-400">
                {quiz.title}
              </span>
              <span className="text-indigo-300 font-semibold">Flip to prompt</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation and Tagging Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-3 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
            currentIndex === 0
              ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleReview(currentQ.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isReview
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isReview ? 'Marked for Review' : 'Mark for Review'}</span>
          </button>

          <button
            onClick={() => toggleMastered(currentQ.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isMastered
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isMastered ? 'Mastered!' : 'Mark Mastered'}</span>
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === quiz.questions.length - 1}
          className={`p-3 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
            currentIndex === quiz.questions.length - 1
              ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

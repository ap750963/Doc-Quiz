import React from 'react';
import { X, Sparkles, FileText, Sliders, CheckCircle2, Zap } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 overflow-hidden animate-pop">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              How DocuQuiz Works
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Multimodal Document Processing</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Upload PDFs, notes, text files, or lecture handouts. Powered by Gemini, the model analyzes and synthesizes full document content accurately.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Customized Difficulty, Formats & Question Count</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Select your preferred question types, choose any custom number of questions (from quick drills to full exams), and calibrate cognitive depth from Easy recall to Hard analytical synthesis.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Engaging, Gamified Practice & History Records</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Simulate real tests in Exam Mode (answers and scores revealed at the end), earn streak combos in Arcade Mode, study 3D flashcards, get on-demand AI Coach memory tricks, and track all past attempt records.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Got it, Let's Quiz!
          </button>
        </div>
      </div>
    </div>
  );
};

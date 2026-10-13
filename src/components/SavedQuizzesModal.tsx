import React from 'react';
import { X, Play, Trash2, Calendar, FileText, Sparkles, Layers } from 'lucide-react';
import { Quiz, QuizMode } from '../types/quiz';
import { sound } from '../utils/sound';

interface SavedQuizzesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuiz: (quiz: Quiz, mode: QuizMode) => void;
  onDeleteQuiz: (quizId: string) => void;
  quizzes: Quiz[];
}

export const SavedQuizzesModal: React.FC<SavedQuizzesModalProps> = ({
  isOpen,
  onClose,
  onSelectQuiz,
  onDeleteQuiz,
  quizzes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pop">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Your Quiz Library
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} saved in this browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {quizzes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <FileText className="w-12 h-12 mx-auto stroke-1 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No quizzes saved yet</p>
              <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                Create a quiz from a document or sample topic to store it here.
              </p>
            </div>
          ) : (
            quizzes.map((q) => {
              const dateStr = new Date(q.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all bg-white dark:bg-slate-800/60 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {q.topic}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {q.title}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      <span>{q.questions.length} questions</span>
                      <span>·</span>
                      <span>~{q.estimatedTimeMinutes} mins</span>
                      <span>·</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectQuiz(q, 'flashcards');
                      }}
                      className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Study Flashcards"
                    >
                      <Layers className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectQuiz(q, 'practice');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Practice with instant feedback"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Practice</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectQuiz(q, 'exam');
                      }}
                      className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Exam Mode: Answers and score revealed at the end"
                    >
                      <span>Exam</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onDeleteQuiz(q.id);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

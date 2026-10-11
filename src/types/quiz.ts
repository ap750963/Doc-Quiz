export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multiple_answer'
  | 'fill_blank';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mixed';

export type QuizMode = 'practice' | 'arcade' | 'flashcards';

export type QuizTone = 'fun' | 'game_show' | 'academic' | 'direct';

export type FocusAngle =
  | 'balanced'
  | 'deep_dive'
  | 'practical'
  | 'quick_recall'
  | 'random_shuffle';

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctAnswer: string[]; // Uniform array of correct answers
  explanation: string;
  hint: string;
  sourceQuote?: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  summary: string;
  estimatedTimeMinutes: number;
  difficulty: DifficultyLevel;
  questions: Question[];
  createdAt: number;
  sourceDocumentName?: string;
  sourceDocumentSnippet?: string;
  batchIndex?: number;
  focusAngle?: FocusAngle;
}

export interface UserAnswerRecord {
  questionId: string;
  selectedAnswers: string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintUsed: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  quizTopic: string;
  difficulty: DifficultyLevel;
  mode: QuizMode;
  completedAt: number;
  score: number;
  totalQuestions: number;
  accuracyPercentage: number;
  bestStreak: number;
  totalTimeSeconds: number;
  answers: Record<string, UserAnswerRecord>;
  quizSnapshot?: Quiz;
}

export interface SampleDoc {
  id: string;
  title: string;
  category: string;
  emoji: string;
  description: string;
  content: string;
}

export interface ActiveDocumentState {
  id: string;
  name: string;
  textContent?: string;
  base64Data?: string;
  mimeType?: string;
  size?: number;
  batchCount: number;
  generatedQuestionTexts: string[];
  lastUsedAt: number;
}

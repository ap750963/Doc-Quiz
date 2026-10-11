import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  Zap,
  Flame,
  Brain,
  Sliders,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Layers,
  Clock,
  Shuffle,
  FileCheck2,
  X,
  Target,
  Plus,
  Minus,
  PenTool,
  RotateCcw,
  ShieldCheck,
  Compass,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DifficultyLevel, QuestionType, QuizMode, QuizTone, Quiz, FocusAngle } from '../types/quiz';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocuments';
import { sound } from '../utils/sound';
import { generateLocalQuiz } from '../utils/localQuizGenerator';
import {
  getActiveDocumentState,
  setActiveDocumentState,
  getPreviousQuestionsForDocument,
  recordQuizForDocument,
  getBatchCountForDocument,
  resetDocumentHistory,
  computeDocumentKey,
} from '../utils/documentHistory';

interface QuizConfiguratorProps {
  onQuizGenerated: (quiz: Quiz, mode: QuizMode) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const QuizConfigurator: React.FC<QuizConfiguratorProps> = ({
  onQuizGenerated,
  isLoading,
  setIsLoading,
}) => {
  // Document state
  const [inputMethod, setInputMethod] = useState<'upload' | 'paste' | 'sample'>('upload');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    base64Data?: string;
    textContent?: string;
  } | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Quiz customization state
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
  ]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [customInputVal, setCustomInputVal] = useState<string>('10');
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [tone, setTone] = useState<QuizTone>('fun');
  const [customTitle, setCustomTitle] = useState('');

  // Variety & Anti-Repetition Shield state
  const [focusAngle, setFocusAngle] = useState<FocusAngle>('balanced');
  const [avoidPriorQuestions, setAvoidPriorQuestions] = useState<boolean>(true);
  const [priorQuestionsCount, setPriorQuestionsCount] = useState<number>(0);
  const [currentBatchNumber, setCurrentBatchNumber] = useState<number>(1);

  const updateDocumentStats = (docName: string, snippet?: string) => {
    const prevQuestions = getPreviousQuestionsForDocument(docName, snippet);
    setPriorQuestionsCount(prevQuestions.length);
    const existingBatches = getBatchCountForDocument(docName, snippet);
    setCurrentBatchNumber(existingBatches + 1);
  };

  // Restore active document if returning to create more quizzes with same document
  React.useEffect(() => {
    const activeDoc = getActiveDocumentState();
    if (activeDoc) {
      if (activeDoc.textContent) {
        setTextInput(activeDoc.textContent);
        if (activeDoc.base64Data) {
          setInputMethod('upload');
          setSelectedFile({
            name: activeDoc.name,
            size: activeDoc.size || 0,
            mimeType: activeDoc.mimeType || 'application/pdf',
            base64Data: activeDoc.base64Data,
            textContent: activeDoc.textContent,
          });
        } else {
          setInputMethod('paste');
        }
      } else if (activeDoc.base64Data) {
        setInputMethod('upload');
        setSelectedFile({
          name: activeDoc.name,
          size: activeDoc.size || 0,
          mimeType: activeDoc.mimeType || 'application/pdf',
          base64Data: activeDoc.base64Data,
        });
      }
      setCustomTitle(`${activeDoc.name.replace(/\.[^/.]+$/, '')} (Part ${activeDoc.batchCount + 1})`);
      updateDocumentStats(activeDoc.name, activeDoc.textContent || '');
    }
  }, []);

  const handleSetPresetCount = (count: number) => {
    sound.playClick();
    setIsCustomCount(false);
    setNumQuestions(count);
    setCustomInputVal(String(count));
  };

  const handleEnableCustomCount = () => {
    sound.playClick();
    setIsCustomCount(true);
    const parsed = parseInt(customInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      setNumQuestions(parsed);
    } else {
      setCustomInputVal('10');
      setNumQuestions(10);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInputVal(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      setNumQuestions(parsed);
    }
  };

  const handleCustomInputBlur = () => {
    let parsed = parseInt(customInputVal, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    if (parsed > 50) parsed = 50;
    setCustomInputVal(String(parsed));
    setNumQuestions(parsed);
  };

  const handleAdjustCustomCount = (delta: number) => {
    sound.playClick();
    setNumQuestions((prev) => {
      const next = Math.min(50, Math.max(1, prev + delta));
      setCustomInputVal(String(next));
      return next;
    });
  };

  // Status & error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Reading document content...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSample = (sampleId: string) => {
    sound.playClick();
    const sample = SAMPLE_DOCUMENTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setSelectedSampleId(sample.id);
    setTextInput(sample.content);
    setSelectedFile(null);
    setCustomTitle(`${sample.title} Quiz`);
    updateDocumentStats(sample.title, sample.content);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    sound.playClick();
    setErrorMessage(null);
    setSelectedSampleId(null);

    const isTextual =
      file.type.startsWith('text/') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json');

    if (isTextual) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setTextInput(text);
        setSelectedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'text/plain',
          textContent: text,
        });
        setCustomTitle(file.name.replace(/\.[^/.]+$/, '') + ' Quiz');
        updateDocumentStats(file.name, text);
      };
      reader.readAsText(file);
    } else {
      // PDF, Images, or docs sent as base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];

        // Attempt client-side text extraction from PDF or document binary
        let extractedText = '';
        try {
          const binaryStr = atob(base64Data);
          const matches = binaryStr.match(/[a-zA-Z0-9.,;:!?'"()\-\s]{4,}/g);
          if (matches && matches.length > 5) {
            extractedText = matches.join(' ').replace(/\s+/g, ' ').slice(0, 12000);
          }
        } catch {
          // ignore
        }

        setSelectedFile({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
          textContent: extractedText || undefined,
        });

        if (extractedText && !textInput.trim()) {
          setTextInput(extractedText);
        }

        setCustomTitle(file.name.replace(/\.[^/.]+$/, '') + ' Quiz');
        updateDocumentStats(file.name, extractedText || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleQuestionType = (type: QuestionType) => {
    sound.playClick();
    setQuestionTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const selectAllTypes = () => {
    sound.playClick();
    setQuestionTypes(['multiple_choice', 'true_false', 'multiple_answer', 'fill_blank']);
  };

  const clearSelectedFile = () => {
    sound.playClick();
    setSelectedFile(null);
    setSelectedSampleId(null);
    setTextInput('');
    setPriorQuestionsCount(0);
    setCurrentBatchNumber(1);
    setActiveDocumentState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetDocumentHistory = () => {
    sound.playClick();
    const docName = selectedFile?.name || (selectedSampleId ? 'Sample Document' : 'Pasted Text');
    const snippet = textInput.slice(0, 300);
    resetDocumentHistory(docName, snippet);
    setPriorQuestionsCount(0);
    setCurrentBatchNumber(1);
  };

  const loadingMessages = [
    'Scanning document structure and key takeaways...',
    'Distilling core concepts and formulating questions...',
    'Calibrating question difficulty and distractors...',
    'Writing memorable hints and insightful explanations...',
    'Polishing your interactive quiz experience...',
  ];

  const handleGenerate = async () => {
    sound.playClick();
    setErrorMessage(null);

    const hasContent = textInput.trim().length > 0 || selectedFile?.base64Data;
    if (!hasContent) {
      setErrorMessage('Please upload a document, paste text, or select one of the sample topics.');
      return;
    }

    if (questionTypes.length === 0) {
      setErrorMessage('Please select at least one question type.');
      return;
    }

    setIsLoading(true);

    // Rotate loading text
    let msgIdx = 0;
    setLoadingStep(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingStep(loadingMessages[msgIdx]);
    }, 2400);

    try {
      const docName = selectedFile?.name || (selectedSampleId ? 'Sample Document' : 'Pasted Text');
      const snippet = textInput.slice(0, 300);
      const avoidQuestions = avoidPriorQuestions
        ? getPreviousQuestionsForDocument(docName, snippet)
        : [];
      const batchIndex = currentBatchNumber;
      const seed = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload: any = {
        questionTypes,
        difficulty,
        numQuestions,
        tone,
        focusAngle,
        batchIndex,
        seed,
        avoidQuestions,
      };

      if (textInput.trim()) {
        payload.content = textInput;
      }

      if (selectedFile?.base64Data) {
        payload.fileData = {
          data: selectedFile.base64Data,
          mimeType: selectedFile.mimeType,
          filename: selectedFile.name,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      let res: Response;
      try {
        res = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      let data: any;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned status ${res.status}: unable to parse response.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate quiz.');
      }

      // Save newly created questions into document registry and update batch tracking
      const newQuestionPrompts = data.quiz.questions.map((q: any) => q.question);
      const nextBatch = recordQuizForDocument(docName, snippet, newQuestionPrompts);
      setCurrentBatchNumber(nextBatch + 1);
      setPriorQuestionsCount((prev) => prev + newQuestionPrompts.length);

      // Save active document state so user can immediately create more quizzes with same document
      setActiveDocumentState({
        id: computeDocumentKey(docName, snippet),
        name: docName,
        textContent: textInput || selectedFile?.textContent,
        base64Data: selectedFile?.base64Data,
        mimeType: selectedFile?.mimeType,
        size: selectedFile?.size,
        batchCount: nextBatch,
        generatedQuestionTexts: [...avoidQuestions, ...newQuestionPrompts],
        lastUsedAt: Date.now(),
      });

      const generatedQuiz: Quiz = {
        id: 'quiz_' + Date.now(),
        title: customTitle.trim() || data.quiz.title || (batchIndex > 1 ? `${docName} (Part ${batchIndex})` : 'Interactive Document Quiz'),
        topic: data.quiz.topic || 'General Knowledge',
        summary: data.quiz.summary || 'A customized quiz generated from your document.',
        estimatedTimeMinutes: data.quiz.estimatedTimeMinutes || Math.ceil(numQuestions * 1.2),
        difficulty,
        questions: data.quiz.questions,
        createdAt: Date.now(),
        sourceDocumentName: docName,
        sourceDocumentSnippet: snippet,
        batchIndex,
        focusAngle,
      };

      // Save to localStorage history
      try {
        const saved = JSON.parse(localStorage.getItem('docuquiz_library') || '[]');
        localStorage.setItem(
          'docuquiz_library',
          JSON.stringify([generatedQuiz, ...saved.slice(0, 19)])
        );
      } catch {
        // Ignore localStorage quota
      }

      sound.playCorrect();
      onQuizGenerated(generatedQuiz, quizMode);
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      sound.playIncorrect();
      const msg = err.message || '';
      if (err.name === 'AbortError') {
        setErrorMessage('The request took longer than expected. You can retry with fewer questions or use the built-in instant engine.');
      } else if (msg.includes('default credentials') || msg.includes('GEMINI_API_KEY') || msg.includes('credentials')) {
        setErrorMessage('Gemini API key is not configured in this environment (e.g. shared preview or deployment). Click "Instant Engine" below to generate your quiz right now without an API key.');
      } else if (msg.includes('Failed to fetch')) {
        setErrorMessage('Connection interrupted or server unreachable. You can retry or use the built-in instant engine.');
      } else {
        setErrorMessage(msg || 'Something went wrong during generation. Please try again.');
      }
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleGenerateOffline = () => {
    sound.playClick();
    setErrorMessage(null);
    let content = textInput.trim() || selectedFile?.textContent || '';
    if (!content && selectedFile) {
      content = `Study document: ${selectedFile.name}. Comprehensive exploration of core concepts, definitions, operational mechanisms, terminology, and practical applications in ${selectedFile.name}.`;
    }
    if (!content) {
      setErrorMessage('Please provide document text, paste notes, or select a sample topic.');
      return;
    }

    const docName = selectedFile?.name || (selectedSampleId ? 'Sample Document' : 'Pasted Text');
    const snippet = content.slice(0, 300);
    const avoidQuestions = avoidPriorQuestions
      ? getPreviousQuestionsForDocument(docName, snippet)
      : [];
    const batchIndex = currentBatchNumber;
    const seed = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const localQuiz = generateLocalQuiz({
      text: content,
      questionTypes,
      difficulty,
      numQuestions,
      customTitle: customTitle.trim(),
      sourceDocumentName: docName,
      avoidQuestions,
      batchIndex,
      focusAngle,
      seed,
    });

    // Record newly generated questions into document registry
    const newQuestionPrompts = localQuiz.questions.map((q: any) => q.question);
    const nextBatch = recordQuizForDocument(docName, snippet, newQuestionPrompts);
    setCurrentBatchNumber(nextBatch + 1);
    setPriorQuestionsCount((prev) => prev + newQuestionPrompts.length);

    setActiveDocumentState({
      id: computeDocumentKey(docName, snippet),
      name: docName,
      textContent: content,
      batchCount: nextBatch,
      generatedQuestionTexts: [...avoidQuestions, ...newQuestionPrompts],
      lastUsedAt: Date.now(),
    });

    try {
      const saved = JSON.parse(localStorage.getItem('docuquiz_library') || '[]');
      localStorage.setItem('docuquiz_library', JSON.stringify([localQuiz, ...saved.slice(0, 19)]));
    } catch {
      // Ignore
    }

    sound.playCorrect();
    onQuizGenerated(localQuiz, quizMode);
  };

  const wordCount = textInput.trim() ? textInput.trim().split(/\s+/).length : 0;
  const charCount = textInput.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Intro */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Multimodal Document Quiz Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight font-display text-balance">
          Transform any document into an{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">
            epic interactive quiz
          </span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 text-balance">
          Upload notes, textbook chapters, or PDFs. Choose your difficulty, question types, and game mode to test and reinforce your knowledge.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Step 1: Document Upload / Input */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  Provide Source Document
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-8">
                Upload a file (PDF, TXT, MD, Images), paste text, or pick a sample study topic.
              </p>
            </div>

            {/* Input Method Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setInputMethod('upload');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  inputMethod === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setInputMethod('paste');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  inputMethod === 'paste'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setInputMethod('sample');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  inputMethod === 'sample'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sample Topics
              </button>
            </div>
          </div>

          {/* Active File / Document Badge if loaded */}
          {selectedFile && (
            <div className="mb-5 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 animate-pop">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                    {wordCount > 0 && ` · ~${wordCount.toLocaleString()} words`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedFile}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Method 1: File Upload */}
          {inputMethod === 'upload' && !selectedFile && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20 dark:hover:bg-slate-800/60 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg"
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 group-hover:scale-110 shadow-xs flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-all mb-4">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Click to browse or drag and drop your document here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports PDF, TXT, Markdown, CSV, JSON, and Images of notes / textbook pages (up to 20MB)
              </p>
            </div>
          )}

          {/* Method 2: Paste Text */}
          {inputMethod === 'paste' && (
            <div>
              <textarea
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  if (selectedFile) setSelectedFile(null);
                }}
                placeholder="Paste your study notes, article excerpt, lecture summary, or textbook chapter here..."
                rows={6}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-sans leading-relaxed resize-y"
              />
              <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
                <span>Direct text input</span>
                <span>
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                </span>
              </div>
            </div>
          )}

          {/* Method 3: Sample Topics */}
          {inputMethod === 'sample' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_DOCUMENTS.map((sample) => {
                const isSelected = selectedSampleId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample.id)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{sample.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {sample.title}
                          </p>
                          {isSelected && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {sample.category}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {sample.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Document Session & Anti-Repetition Shield Banner */}
          {(priorQuestionsCount > 0 || currentBatchNumber > 1) && (
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-pop">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      Document Session: Quiz Batch #{currentBatchNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                      {priorQuestionsCount} questions already generated
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {avoidPriorQuestions
                      ? 'Anti-Duplication Shield active: Generates completely fresh questions exploring alternate paragraphs and concepts.'
                      : 'Shield paused: Questions may overlap with earlier batches.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={avoidPriorQuestions}
                    onChange={(e) => setAvoidPriorQuestions(e.target.checked)}
                    className="accent-emerald-600 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Exclude previous questions
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleResetDocumentHistory}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear question history for this document and start from Batch #1"
                >
                  Reset History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Question Types */}
        <div className="p-5 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
                  Customize Question Types
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-8 hidden sm:block">
                Choose one or more question formats for your quiz.
              </p>
            </div>
            <button
              type="button"
              onClick={selectAllTypes}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer shrink-0"
            >
              Select All
            </button>
          </div>

          {/* 4 Rounded Rectangle Buttons Placed Horizontally */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 w-full">
            {[
              {
                id: 'multiple_choice' as QuestionType,
                title: 'Multiple Choice',
                shortTitle: 'MCQ',
                icon: '🔘',
                desc: 'Single correct answer from 4 choices',
              },
              {
                id: 'true_false' as QuestionType,
                title: 'True / False',
                shortTitle: 'T / F',
                icon: '⚖️',
                desc: 'Binary statements to verify',
              },
              {
                id: 'multiple_answer' as QuestionType,
                title: 'Multi-Answer',
                shortTitle: 'Multi',
                icon: '☑️',
                desc: 'Check all correct choices (2+)',
              },
              {
                id: 'fill_blank' as QuestionType,
                title: 'Fill in Blank',
                shortTitle: 'Blanks',
                icon: '✍️',
                desc: 'Recall & type missing keyword',
              },
            ].map((type) => {
              const isChecked = questionTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleQuestionType(type.id)}
                  title={type.desc}
                  className={`w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 relative ${
                    isChecked
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="text-sm sm:text-base shrink-0 leading-none">{type.icon}</span>
                  <span className="text-[11px] sm:text-xs md:text-sm truncate">
                    <span className="sm:hidden">{type.shortTitle}</span>
                    <span className="hidden sm:inline">{type.title}</span>
                  </span>
                  {isChecked && (
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-0.5 sm:ml-1 text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
            <span>
              {questionTypes.length === 4
                ? 'All 4 question formats active for maximum cognitive variety.'
                : `${questionTypes.length} question format${questionTypes.length === 1 ? '' : 's'} enabled.`}
            </span>
            <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Tap buttons to toggle</span>
          </p>
        </div>

        {/* Step 3: Difficulty Levels */}
        <div className="p-5 sm:p-7 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
              Difficulty Level
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 ml-8 hidden sm:block">
            Tailor the cognitive challenge to your learning goals.
          </p>

          {/* 4 Rounded Rectangle Buttons Placed Horizontally */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 w-full">
            {[
              {
                id: 'easy' as DifficultyLevel,
                title: 'Easy',
                icon: '🌱',
                desc: 'Direct recall, definitions & core facts',
                activeClass: 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20',
              },
              {
                id: 'medium' as DifficultyLevel,
                title: 'Medium',
                icon: '⚡',
                desc: 'Comprehension & cause-and-effect reasoning',
                activeClass: 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20',
              },
              {
                id: 'hard' as DifficultyLevel,
                title: 'Hard',
                icon: '🔥',
                desc: 'Deep analytical synthesis, edge cases & nuances',
                activeClass: 'border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20',
              },
              {
                id: 'mixed' as DifficultyLevel,
                title: 'Mixed',
                icon: '🎲',
                desc: 'Dynamic progressive mix from Easy to Hard',
                activeClass: 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20',
              },
            ].map((level) => {
              const isSelected = difficulty === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setDifficulty(level.id);
                  }}
                  title={level.desc}
                  className={`w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    isSelected
                      ? `${level.activeClass} shadow-xs font-bold`
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="text-sm sm:text-base shrink-0 leading-none">{level.icon}</span>
                  <span className="text-[11px] sm:text-xs md:text-sm truncate font-bold">{level.title}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}:
            </span>
            <span>
              {difficulty === 'easy' && 'Direct recall, definitions & core facts'}
              {difficulty === 'medium' && 'Comprehension & cause-and-effect reasoning'}
              {difficulty === 'hard' && 'Deep analytical synthesis, edge cases & nuances'}
              {difficulty === 'mixed' && 'Balanced progression from Easy to Hard'}
            </span>
          </p>
        </div>

        {/* Step 4: Mode, Count & Vibe */}
        <div className="p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Number of Questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Question Count
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {numQuestions} {numQuestions === 1 ? 'Question' : 'Questions'}
                  {isCustomCount && (
                    <span className="ml-1 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                      Custom
                    </span>
                  )}
                </span>
              </div>

              {/* Quick Presets + Custom Button */}
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {[5, 10, 15, 20].map((count) => {
                  const isSelected = !isCustomCount && numQuestions === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleSetPresetCount(count)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {count} Qs
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleEnableCustomCount}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    isCustomCount
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                  }`}
                  title="Enter custom number of questions"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Custom</span>
                </button>
              </div>

              {/* Custom Question Count Panel */}
              {isCustomCount ? (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-slate-700 shadow-xs animate-pop">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Count:</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">1 – 50 questions</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustCustomCount(-1)}
                      disabled={numQuestions <= 1}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={customInputVal}
                        onChange={handleCustomInputChange}
                        onBlur={handleCustomInputBlur}
                        className="w-full text-center py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 font-bold text-base text-slate-900 dark:text-white outline-none tabular-nums"
                        placeholder="e.g. 12"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdjustCustomCount(1)}
                      disabled={numQuestions >= 50}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
                      title="Increase by 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick increments */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-1">Quick add:</span>
                    {[1, 5, 10].map((increment) => (
                      <button
                        key={increment}
                        type="button"
                        onClick={() => handleAdjustCustomCount(increment)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        +{increment}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={30}
                      value={numQuestions}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNumQuestions(val);
                        setCustomInputVal(String(val));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 tabular-nums">
                      {numQuestions}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableCustomCount}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold mt-1.5 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Set custom number (1 - 50)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quiz Game Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Play Mode
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'practice' as QuizMode,
                    title: 'Practice Mode',
                    desc: 'Instant hints & didactic explanations',
                    icon: '🎯',
                  },
                  {
                    id: 'arcade' as QuizMode,
                    title: 'Arcade Mode',
                    desc: 'Timer countdown & streak combos',
                    icon: '⚡',
                  },
                  {
                    id: 'flashcards' as QuizMode,
                    title: 'Flashcards',
                    desc: '3D card flip self-paced review',
                    icon: '🗂️',
                  },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setQuizMode(mode.id);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      quizMode === mode.id
                        ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500/20'
                        : 'bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg">{mode.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {mode.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Persona / Tone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Quiz Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'fun' as QuizTone, title: 'Witty & Fun', emoji: '🎉' },
                  { id: 'game_show' as QuizTone, title: 'Game Show', emoji: '🎙️' },
                  { id: 'academic' as QuizTone, title: 'Academic', emoji: '🎓' },
                  { id: 'direct' as QuizTone, title: 'Direct & Crisp', emoji: '🎯' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setTone(t.id);
                    }}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      tone === t.id
                        ? 'bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500/20 font-semibold'
                        : 'bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-base block mb-0.5">{t.emoji}</span>
                    <span className="text-xs text-slate-900 dark:text-white block truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Variety & Focus Angle */}
            <div className="md:col-span-3 pt-5 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Question Variety & Focus Angle
                  </label>
                  {currentBatchNumber > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                      Batch #{currentBatchNumber}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Steers generation perspective across repeat quizzes
                </span>
              </div>

              {/* 4 Rounded Rectangle Buttons Placed Horizontally */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 w-full">
                {[
                  {
                    id: 'balanced' as FocusAngle,
                    title: 'Balanced',
                    shortTitle: 'Balanced',
                    icon: '⚖️',
                    desc: 'Covers a balanced, representative cross-section of the entire document',
                  },
                  {
                    id: 'deep_dive' as FocusAngle,
                    title: 'Deep Dive',
                    shortTitle: 'Deep Dive',
                    icon: '🔬',
                    desc: 'Explores technical nuances, fine details and complex concepts',
                  },
                  {
                    id: 'practical' as FocusAngle,
                    title: 'Practical',
                    shortTitle: 'Practical',
                    icon: '🛠️',
                    desc: 'Tests real-world applications, scenarios and cause-and-effect reasoning',
                  },
                  {
                    id: 'random_shuffle' as FocusAngle,
                    title: 'Surprise Me',
                    shortTitle: 'Surprise',
                    icon: '🔀',
                    desc: 'Maximizes variety with unexplored angles and secondary facts',
                  },
                ].map((angle) => {
                  const isSelected = focusAngle === angle.id;
                  return (
                    <button
                      key={angle.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setFocusAngle(angle.id);
                      }}
                      title={angle.desc}
                      className={`w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white font-medium'
                      }`}
                    >
                      <span className="text-sm sm:text-base shrink-0 leading-none">{angle.icon}</span>
                      <span className="text-[11px] sm:text-xs md:text-sm truncate font-bold">
                        <span className="sm:hidden">{angle.shortTitle}</span>
                        <span className="hidden sm:inline">{angle.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 truncate">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {focusAngle === 'balanced' && 'Balanced:'}
                  {focusAngle === 'deep_dive' && 'Deep Dive:'}
                  {focusAngle === 'practical' && 'Practical:'}
                  {focusAngle === 'random_shuffle' && 'Surprise Me:'}
                  {focusAngle === 'quick_recall' && 'Key Terms:'}
                </span>
                <span>
                  {focusAngle === 'balanced' && 'Covers a balanced, representative cross-section of the entire document'}
                  {focusAngle === 'deep_dive' && 'Explores technical nuances, fine details and complex concepts'}
                  {focusAngle === 'practical' && 'Tests real-world applications, scenarios and cause-and-effect reasoning'}
                  {focusAngle === 'random_shuffle' && 'Maximizes variety with unexplored angles and secondary facts'}
                  {focusAngle === 'quick_recall' && 'Focuses on vocabulary, key terms & definitions'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Error message banner if any */}
        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border-t border-red-100 dark:border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-700 dark:text-red-300 text-sm">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5 sm:mt-0" />
              <p className="font-medium text-xs sm:text-sm">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleGenerate}
                className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-800 dark:text-red-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry with AI</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateOffline}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate with Instant Engine</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>
              Configured: {numQuestions} questions{isCustomCount ? ' (Custom)' : ''} · {difficulty.toUpperCase()} difficulty ·{' '}
              {questionTypes.length} formats
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              isLoading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/25 active:scale-98'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Quiz with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Modal / Overlay during generation */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
            >
              {/* Animated top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />

              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">
                Creating Your Quiz
              </h3>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-2 h-10 flex items-center justify-center transition-all">
                {loadingStep}
              </p>

              <div className="mt-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full animate-[wiggle_1.5s_ease-in-out_infinite] w-2/3 mx-auto" />
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                Analyzing facts, definitions, and formulating distractors...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

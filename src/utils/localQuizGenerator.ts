import type { Quiz, Question, QuestionType, DifficultyLevel, FocusAngle } from '../types/quiz.js';

interface GenerateLocalQuizOptions {
  text: string;
  questionTypes: QuestionType[];
  difficulty: DifficultyLevel;
  numQuestions: number;
  customTitle?: string;
  sourceDocumentName?: string;
  avoidQuestions?: string[];
  batchIndex?: number;
  focusAngle?: FocusAngle;
  seed?: number | string;
}

export function generateLocalQuiz({
  text,
  questionTypes,
  difficulty,
  numQuestions,
  customTitle,
  sourceDocumentName,
  avoidQuestions = [],
  batchIndex = 1,
  focusAngle = 'balanced',
  seed = Date.now(),
}: GenerateLocalQuizOptions): Quiz {
  const cleanText = text.trim();
  let sentences = cleanText
    .split(/(?<=[.?!])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 20 || s.length > 350) return false;
      // Reject binary PDF streams, PostScript tokens, or junk fragments
      if (/\b(FlateDecode|xref|trailer|endobj|startxref|MediaBox|FontFile)\b/i.test(s)) return false;
      const alphaWords = s.match(/[A-Za-z]{2,}/g) || [];
      if (alphaWords.length < 4) return false;
      const nonAlpha = s.replace(/[A-Za-z0-9\s.,?!'"-]/g, '').length;
      if (nonAlpha / s.length > 0.2) return false; // Reject high-symbol-density binary noise
      return true;
    });

  if (sentences.length === 0) {
    const docTopic = (sourceDocumentName || 'Document Study').replace(/\.[^/.]+$/, '');
    sentences = [
      `${docTopic} covers fundamental principles, foundational structures, and technical methodologies.`,
      `Students examine core terminology, systematic operations, and practical applications in ${docTopic}.`,
      `Understanding the relationship between cause, mechanism, and effect is essential to mastering ${docTopic}.`,
      `Analytical evaluation and thorough conceptual recall reinforce long-term mastery of ${docTopic}.`,
    ];
  }

  // If avoiding previous questions, filter or rotate sentences
  const avoidSet = new Set(avoidQuestions.map((q) => q.toLowerCase().slice(0, 40)));
  const unusedSentences = sentences.filter((s) => !avoidSet.has(s.toLowerCase().slice(0, 40)));
  if (unusedSentences.length >= 3) {
    sentences = unusedSentences;
  }

  // Shuffle sentences based on batchIndex and seed to guarantee variety
  const numericSeed = typeof seed === 'number' ? seed : String(seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shift = (batchIndex - 1) * 7 + (numericSeed % 13);
  if (sentences.length > 0) {
    sentences = [...sentences.slice(shift % sentences.length), ...sentences.slice(0, shift % sentences.length)];
    // Pseudo-shuffle
    sentences = sentences.sort((a, b) => ((a.length * 31 + shift) % 17) - ((b.length * 31 + shift) % 17));
  }

  const sentencesText = sentences.join(' ');
  const words = sentencesText.match(/\b[A-Za-z]{4,}\b/g) || [
    'Concept',
    'Structure',
    'Process',
    'System',
    'Analysis',
    'Function',
  ];
  const uniqueWords = Array.from(new Set(words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())));

  const count = Math.min(Math.max(1, numQuestions), Math.max(1, sentences.length * 2, 50));
  const questions: Question[] = [];
  const selectedTypes = questionTypes.length > 0 ? questionTypes : ['multiple_choice', 'true_false'];

  for (let i = 0; i < count; i++) {
    const qType = selectedTypes[i % selectedTypes.length];
    const baseSentence = sentences[i % sentences.length] || sentences[0] || 'DocuQuiz analyzes interactive document material.';
    const qId = `q_local_${i + 1}_${Date.now()}`;

    // Extract potential key terms from the sentence
    const sentenceWords = baseSentence.match(/\b[A-Za-z]{4,}\b/g) || ['concept'];
    const keyTerm = sentenceWords[Math.floor(sentenceWords.length / 2)] || 'system';

    if (qType === 'true_false') {
      const isTrue = i % 2 === 0;
      let questionPrompt = baseSentence;
      let correctAns = isTrue ? 'True' : 'False';
      let explanation = isTrue
        ? `This statement accurately reflects the passage: "${baseSentence}"`
        : `This statement contradicts the document. The actual fact is: "${baseSentence}"`;

      if (!isTrue) {
        // Alter the sentence slightly to make it false
        const otherTerm = uniqueWords[(i + 3) % uniqueWords.length] || 'unrelated concept';
        questionPrompt = baseSentence.replace(new RegExp(`\\b${keyTerm}\\b`, 'i'), otherTerm);
      }

      questions.push({
        id: qId,
        type: 'true_false',
        difficulty: difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: `True or False: ${questionPrompt}`,
        options: ['True', 'False'],
        correctAnswer: [correctAns],
        explanation,
        hint: `Check the exact phrasing and factual statements from the document regarding ${keyTerm}.`,
        sourceQuote: baseSentence.slice(0, 150),
      });
    } else if (qType === 'fill_blank') {
      const blankedSentence = baseSentence.replace(new RegExp(`\\b${keyTerm}\\b`, 'i'), '_____');
      questions.push({
        id: qId,
        type: 'fill_blank',
        difficulty: difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: `Complete the passage: "${blankedSentence}"`,
        options: [],
        correctAnswer: [keyTerm],
        explanation: `The missing term is "${keyTerm}". Full context: "${baseSentence}"`,
        hint: `The word starts with "${keyTerm.slice(0, 2)}" and has ${keyTerm.length} letters.`,
        sourceQuote: baseSentence.slice(0, 150),
      });
    } else if (qType === 'multiple_answer') {
      // Pick 2 correct statements and 2 altered
      const correctA = baseSentence;
      const otherSentence = sentences[(i + 1) % sentences.length] || 'The system operates systematically.';
      const correctB = otherSentence;

      const distractor1 = `The document explicitly disproves that ${keyTerm.toLowerCase()} is significant.`;
      const distractor2 = `There is no relationship between ${keyTerm.toLowerCase()} and foundational outcomes.`;

      questions.push({
        id: qId,
        type: 'multiple_answer',
        difficulty: difficulty === 'mixed' ? 'medium' : (difficulty as any),
        question: `Which of the following statements are supported by the provided text regarding ${keyTerm}? (Select all that apply)`,
        options: [correctA, distractor1, correctB, distractor2],
        correctAnswer: [correctA, correctB],
        explanation: `Statements derived directly from the document are supported, whereas fabricated negatives contradict the content.`,
        hint: `Two of the options reflect exact ideas expressed in the passage.`,
        sourceQuote: baseSentence.slice(0, 150),
      });
    } else {
      // multiple_choice
      const distractorPool = uniqueWords
        .filter((w) => w.toLowerCase() !== keyTerm.toLowerCase())
        .slice(i, i + 3);
      while (distractorPool.length < 3) {
        distractorPool.push(`Alternative ${distractorPool.length + 1}`);
      }

      const options = [keyTerm, ...distractorPool].sort(() => 0.5 - Math.random());
      const blankedSentence = baseSentence.replace(new RegExp(`\\b${keyTerm}\\b`, 'i'), '______');

      questions.push({
        id: qId,
        type: 'multiple_choice',
        difficulty: difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: `Based on the document, which term correctly completes: "${blankedSentence}"?`,
        options,
        correctAnswer: [keyTerm],
        explanation: `In the provided document, the correct term is "${keyTerm}". Context: "${baseSentence}"`,
        hint: `Focus on the key term describing this specific relationship in the text.`,
        sourceQuote: baseSentence.slice(0, 150),
      });
    }
  }

  // Derive title from text or fallback
  const firstLine = cleanText.split('\n')[0]?.replace(/[#*_-]/g, '').trim();
  const derivedTitle =
    customTitle?.trim() ||
    (firstLine && firstLine.length < 50 ? `${firstLine} Quiz` : 'Comprehensive Document Quiz');

  return {
    id: 'quiz_' + Date.now(),
    title: derivedTitle,
    topic: 'Document Study',
    summary: `Interactive quiz generated with ${questions.length} questions covering core takeaways.`,
    estimatedTimeMinutes: Math.max(1, Math.ceil(questions.length * 1.2)),
    difficulty,
    questions,
    createdAt: Date.now(),
    sourceDocumentName: sourceDocumentName || 'Uploaded Document',
    sourceDocumentSnippet: cleanText.slice(0, 300),
  };
}

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

  const STOP_WORDS = new Set([
    'about', 'above', 'after', 'again', 'against', 'all', 'also', 'although', 'among',
    'and', 'another', 'any', 'are', 'around', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'came', 'can', 'cannot', 'could', 'did',
    'does', 'doing', 'done', 'down', 'during', 'each', 'even', 'every', 'few',
    'first', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'here',
    'how', 'into', 'its', 'just', 'made', 'make', 'many', 'more', 'most',
    'much', 'must', 'only', 'other', 'our', 'out', 'over', 'said', 'same',
    'should', 'since', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
    'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'too',
    'under', 'until', 'upon', 'very', 'was', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would',
  ]);

  if (sentences.length === 0) {
    throw new Error(
      'The document does not contain enough readable text to generate quiz questions. Please paste your text directly or upload a document with selectable text.'
    );
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
    sentences = sentences.sort((a, b) => ((a.length * 31 + shift) % 17) - ((b.length * 31 + shift) % 17));
  }

  // Extract substantive keywords from document sentences (excluding stop words)
  const candidateKeywords: string[] = [];
  for (const s of sentences) {
    const rawMatches = s.match(/\b[A-Za-z0-9-]{3,}\b/g) || [];
    for (const w of rawMatches) {
      const lower = w.toLowerCase();
      if (!STOP_WORDS.has(lower) && !/^\d+$/.test(w) && w.length >= 4) {
        candidateKeywords.push(w);
      }
    }
  }

  const uniqueKeywords = Array.from(new Set(candidateKeywords));

  const count = Math.min(Math.max(1, numQuestions), Math.max(1, sentences.length * 2, 50));
  const questions: Question[] = [];
  const selectedTypes = questionTypes.length > 0 ? questionTypes : ['multiple_choice', 'true_false'];

  for (let i = 0; i < count; i++) {
    const qType = selectedTypes[i % selectedTypes.length];
    const baseSentence = sentences[i % sentences.length] || sentences[0];
    const qId = `q_local_${i + 1}_${Date.now()}`;

    // Find the best keyword in this sentence
    const sWords = (baseSentence.match(/\b[A-Za-z0-9-]{3,}\b/g) || [])
      .filter((w) => !STOP_WORDS.has(w.toLowerCase()) && w.length >= 4);
    
    // Prioritize capitalized or longer substantive words
    const sortedWords = [...sWords].sort((a, b) => {
      const aCap = /^[A-Z]/.test(a) ? 2 : 0;
      const bCap = /^[A-Z]/.test(b) ? 2 : 0;
      return (bCap + b.length) - (aCap + a.length);
    });

    const keyTerm = sortedWords[0] || uniqueKeywords[(i * 3) % Math.max(1, uniqueKeywords.length)] || 'concept';

    if (qType === 'true_false') {
      const isTrue = i % 2 === 0;
      let questionPrompt = baseSentence;
      const correctAns = isTrue ? 'True' : 'False';

      if (!isTrue) {
        // Create a plausible contrast statement by altering a key term with another real term from the text
        const otherTerm = uniqueKeywords.find((k) => k.toLowerCase() !== keyTerm.toLowerCase()) || 'an alternate principle';
        questionPrompt = baseSentence.replace(new RegExp(`\\b${keyTerm}\\b`, 'i'), otherTerm);
        if (questionPrompt === baseSentence) {
          questionPrompt = `According to the document, ${keyTerm} has no documented relevance to the topic.`;
        }
      }

      const explanation = isTrue
        ? `Accurate. The document explicitly affirms: "${baseSentence}"`
        : `Inaccurate. The document confirms: "${baseSentence}"`;

      questions.push({
        id: qId,
        type: 'true_false',
        difficulty: difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: `According to the text, is this statement accurate: "${questionPrompt}"?`,
        options: ['True', 'False'],
        correctAnswer: [correctAns],
        explanation,
        hint: `Look for the passage addressing "${keyTerm}" in your document.`,
        sourceQuote: baseSentence.slice(0, 160),
      });
    } else if (qType === 'fill_blank') {
      const blankedSentence = baseSentence.replace(new RegExp(`\\b${keyTerm}\\b`, 'i'), '_____');
      questions.push({
        id: qId,
        type: 'fill_blank',
        difficulty: difficulty === 'mixed' ? (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: `Fill in the missing term: "${blankedSentence}"`,
        options: [],
        correctAnswer: [keyTerm],
        explanation: `The missing term is "${keyTerm}". Context: "${baseSentence}"`,
        hint: `Starts with "${keyTerm.slice(0, 2)}" and has ${keyTerm.length} letters.`,
        sourceQuote: baseSentence.slice(0, 160),
      });
    } else if (qType === 'multiple_answer') {
      const correctA = baseSentence;
      const otherIdx = (i + 1) % sentences.length;
      const correctB = sentences[otherIdx] && sentences[otherIdx] !== baseSentence
        ? sentences[otherIdx]
        : `Key facts regarding ${keyTerm} are emphasized in this section.`;

      // Distractors made from subtle negations or opposite claims
      const distractor1 = `The text indicates that ${keyTerm.toLowerCase()} is entirely omitted from the scope.`;
      const distractor2 = `The document claims that no empirical observation supports ${keyTerm.toLowerCase()}.`;

      questions.push({
        id: qId,
        type: 'multiple_answer',
        difficulty: difficulty === 'mixed' ? 'medium' : (difficulty as any),
        question: `Which of the following statements are supported by the provided text regarding ${keyTerm}? (Select all that apply)`,
        options: [correctA, distractor1, correctB, distractor2].sort(() => 0.5 - Math.random()),
        correctAnswer: [correctA, correctB],
        explanation: `Statements derived directly from the document are verified facts, whereas fabricated negative claims contradict the text.`,
        hint: `Review the direct statements discussing ${keyTerm} in the document.`,
        sourceQuote: baseSentence.slice(0, 160),
      });
    } else {
      // multiple_choice
      const distractorPool = uniqueKeywords
        .filter((w) => w.toLowerCase() !== keyTerm.toLowerCase())
        .slice(i, i + 6)
        .slice(0, 3);

      // If document keywords are few, use meaningful contextual descriptors rather than generic "Alternative X"
      while (distractorPool.length < 3) {
        const fallbacks = ['Primary Factor', 'Secondary Mechanism', 'Control Group', 'Standard Parameter'];
        const fb = fallbacks[distractorPool.length] || `Factor ${distractorPool.length + 1}`;
        distractorPool.push(fb);
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
        explanation: `In the provided text, the correct term is "${keyTerm}". Context: "${baseSentence}"`,
        hint: `Focus on the key term describing this context in the passage.`,
        sourceQuote: baseSentence.slice(0, 160),
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

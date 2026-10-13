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

interface ParsedMCQ {
  qIndex: number;
  question: string;
  options: { letter: string; text: string; isMarked?: boolean }[];
  answerString: string;
  explanation: string;
  isTrueFalse?: boolean;
}

function extractExistingMCQs(rawText: string): ParsedMCQ[] {
  const text = rawText.replace(/\r\n/g, '\n');

  // 1. Detect answer key table/list at the bottom of the document if present
  const answerKeyMap = new Map<number, string>();
  const answerKeyMatch = text.match(/(?:Answer\s*Key|Answers?|Solutions?)\s*[:\n]([\s\S]+)$/i);
  if (answerKeyMatch) {
    const keySection = answerKeyMatch[1];
    const keyEntries = Array.from(
      keySection.matchAll(/(?:(?:^|\s|,)(?:Q\.?\s*)?(\d+)[\.\-\:\s\)]*([A-Fa-f]|\([A-Fa-f]\)|True|False))/gi)
    );
    for (const m of keyEntries) {
      const qNum = parseInt(m[1], 10);
      const val = m[2].replace(/[\(\)\s]/g, '').toUpperCase();
      answerKeyMap.set(qNum, val);
    }
  }

  const lines = text.split('\n');
  const extracted: ParsedMCQ[] = [];
  let cur: ParsedMCQ | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is the start of an Answer Key section at the bottom
    if (/^(?:Answer\s*Key|Answers?|Solutions?)\s*[:\n]?$/i.test(line)) {
      if (cur && (cur.options.length >= 2 || cur.isTrueFalse)) {
        extracted.push(cur);
      }
      cur = null;
      break;
    }

    // Direct answer line under question: e.g. "Answer: B", "Ans: (b)", "Correct: Mitochondria"
    const ansMatch = line.match(
      /^(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Solution)\s*[:\.\-]?\s*([A-Fa-f]|\([A-Fa-f]\)|True|False|[^\n]+)/i
    );
    if (ansMatch && cur) {
      cur.answerString = ansMatch[1].trim();
      continue;
    }

    // Explanation line: e.g. "Explanation: Mitochondria is ..."
    const expMatch = line.match(/^Explanation\s*[:\.\-]?\s*(.+)/i);
    if (expMatch && cur) {
      cur.explanation = expMatch[1].trim();
      continue;
    }

    // Check for Question start: e.g. "1. ", "Q1. ", "Question 1: ", "(1) "
    const qMatch = line.match(/^(\b(?:Q(?:uestion)?\.?\s*(\d+)|(\d+)[\.\)]|\((\d+)\)))\s*[:\.]?\s*(.+)/i);
    if (qMatch) {
      if (cur && (cur.options.length >= 2 || cur.isTrueFalse)) {
        extracted.push(cur);
      }
      const numStr = qMatch[2] || qMatch[3] || qMatch[4] || '0';
      const questionText = qMatch[5].trim();
      const isTF = /\b(True\s*\/\s*False|True\s+or\s+False)\b/i.test(questionText);
      cur = {
        qIndex: parseInt(numStr, 10) || extracted.length + 1,
        question: questionText,
        options: [],
        answerString: '',
        explanation: '',
        isTrueFalse: isTF,
      };
      continue;
    }

    // Check for inline options on a single line: (A) ... (B) ... (C) ... (D) ...
    const inlineMatches = Array.from(
      line.matchAll(
        /(?:\(([A-Fa-f])\)|\[([A-Fa-f])\]|(?:\b|^)([A-Fa-f])[\.\)])\s*([^(\n\r\[]+?(?=(?:\s*(?:\([A-Fa-f]\)|\[[A-Fa-f]\]|[A-Fa-f][\.\)]))|$))/gi
      )
    );
    if (inlineMatches.length >= 2 && cur) {
      for (const m of inlineMatches) {
        const letter = (m[1] || m[2] || m[3]).toUpperCase();
        const optText = m[4].trim();
        cur.options.push({ letter, text: optText });
      }
      continue;
    }

    // Check for single option: e.g. "A) ...", "(A) ...", "A. ...", "*B) ..."
    const optMatch = line.match(/^(\([A-Fa-f]\)|\[[A-Fa-f]\]|\*?[A-Fa-f][\.\)\:])\s*(.+)/i);
    if (optMatch && cur) {
      const isMarked = line.startsWith('*') || line.includes('(correct)') || line.includes('[x]');
      const letter = optMatch[1].replace(/[\*\(\)\[\]\.\:\s]/g, '').toUpperCase();
      const optText = optMatch[2].replace(/\s*\((?:correct|answer)\)|\s*\*$/i, '').trim();
      cur.options.push({ letter, text: optText, isMarked });
      continue;
    }

    // Continuation line
    if (cur) {
      if (cur.options.length === 0) {
        cur.question += ' ' + line;
      } else {
        cur.options[cur.options.length - 1].text += ' ' + line;
      }
    }
  }

  if (cur && (cur.options.length >= 2 || cur.isTrueFalse)) {
    extracted.push(cur);
  }

  // Resolve correct answer for each extracted question
  for (const q of extracted) {
    if (answerKeyMap.has(q.qIndex)) {
      q.answerString = answerKeyMap.get(q.qIndex) || q.answerString;
    }
  }

  return extracted;
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

  // CHECK FIRST: Does the document already contain pre-existing MCQs / questions?
  const existingMCQs = extractExistingMCQs(cleanText);

  if (existingMCQs.length >= 1) {
    // Directly use the real questions from the document!
    const avoidSet = new Set(avoidQuestions.map((q) => q.toLowerCase().slice(0, 40)));
    const unusedMCQs = existingMCQs.filter(
      (m) => !avoidSet.has(m.question.toLowerCase().slice(0, 40))
    );
    const pool = unusedMCQs.length > 0 ? unusedMCQs : existingMCQs;

    // Shift based on batch index to rotate through questions
    const offset = ((batchIndex - 1) * numQuestions) % pool.length;
    const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
    const selectedMCQs = rotated.slice(0, numQuestions);

    const questions: Question[] = selectedMCQs.map((mcq, idx) => {
      const qId = `q_pdf_${mcq.qIndex}_${idx + 1}_${Date.now()}`;
      // Clean question text of leading "1.", "Q1:", etc. if present
      const cleanPrompt = mcq.question
        .replace(/^(\b(?:Q(?:uestion)?\.?\s*\d+|\d+[\.\)]|\(\d+\)))\s*[:\.]?\s*/i, '')
        .trim();

      // Check if True/False
      if (mcq.isTrueFalse || (mcq.options.length === 2 && mcq.options[0].text.toLowerCase() === 'true')) {
        let isTrue = true;
        if (/false/i.test(mcq.answerString)) isTrue = false;
        return {
          id: qId,
          type: 'true_false',
          difficulty: difficulty === 'mixed' ? (idx % 2 === 0 ? 'easy' : 'medium') : (difficulty as any),
          question: cleanPrompt,
          options: ['True', 'False'],
          correctAnswer: [isTrue ? 'True' : 'False'],
          explanation: mcq.explanation || `Answer: ${isTrue ? 'True' : 'False'} (from original document).`,
          hint: 'Consider the factual basis of the statement directly from your study material.',
          sourceQuote: mcq.question,
        };
      }

      // Multiple choice options
      const optTexts = mcq.options.map((o) => o.text);
      while (optTexts.length < 4) {
        optTexts.push(`Alternative ${optTexts.length + 1}`);
      }

      // Determine correct answer
      let correctOptText = optTexts[0];
      let ansLetter = '';

      if (mcq.answerString) {
        const letMatch = mcq.answerString.match(/^[(\[]?([A-Fa-f])[)\]\.\s]?/);
        if (letMatch) {
          ansLetter = letMatch[1].toUpperCase();
        } else {
          // If answer is textual (e.g. "Mitochondria"), find matching option
          const matching = optTexts.find(
            (o) => o.toLowerCase() === mcq.answerString.toLowerCase() || o.toLowerCase().includes(mcq.answerString.toLowerCase())
          );
          if (matching) correctOptText = matching;
        }
      }

      if (ansLetter) {
        const letterIndex = ansLetter.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1
        if (mcq.options[letterIndex]) {
          correctOptText = mcq.options[letterIndex].text;
        } else if (optTexts[letterIndex]) {
          correctOptText = optTexts[letterIndex];
        }
      } else {
        const marked = mcq.options.find((o) => o.isMarked);
        if (marked) correctOptText = marked.text;
      }

      return {
        id: qId,
        type: 'multiple_choice',
        difficulty: difficulty === 'mixed' ? (idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'medium' : 'hard') : (difficulty as any),
        question: cleanPrompt,
        options: optTexts,
        correctAnswer: [correctOptText],
        explanation:
          mcq.explanation ||
          `The correct answer is "${correctOptText}", extracted directly from your PDF question bank.`,
        hint: `Carefully evaluate the choices: ${optTexts.slice(0, 2).join(' vs ')}.`,
        sourceQuote: mcq.question,
      };
    });

    const firstLine = cleanText.split('\n')[0]?.replace(/[#*_-]/g, '').trim();
    const derivedTitle =
      customTitle?.trim() ||
      (firstLine && firstLine.length < 50 ? `${firstLine} Practice Quiz` : 'PDF Exam Questions Quiz');

    return {
      id: 'quiz_' + Date.now(),
      title: derivedTitle,
      topic: 'Practice Exam / Questions',
      summary: `Practice quiz featuring ${questions.length} questions extracted directly from your PDF question bank.`,
      estimatedTimeMinutes: Math.max(1, Math.ceil(questions.length * 1.5)),
      difficulty,
      questions,
      createdAt: Date.now(),
      sourceDocumentName: sourceDocumentName || 'Uploaded Document',
      sourceDocumentSnippet: cleanText.slice(0, 300),
    };
  }

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

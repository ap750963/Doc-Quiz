import express from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// CORS headers for iframe and cross-origin security
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface GenerateQuizRequest {
  content?: string;
  fileData?: {
    data: string; // base64
    mimeType: string;
    filename: string;
  };
  questionTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  numQuestions: number;
  tone?: 'fun' | 'academic' | 'game_show' | 'direct';
  avoidQuestions?: string[];
  focusAngle?: 'balanced' | 'deep_dive' | 'practical' | 'quick_recall' | 'random_shuffle';
  seed?: number | string;
  batchIndex?: number;
}

app.post('/api/generate-quiz', async (req, res) => {
  try {
    const {
      content,
      fileData,
      questionTypes = ['multiple_choice', 'true_false'],
      difficulty = 'medium',
      numQuestions = 10,
      tone = 'fun',
      avoidQuestions = [],
      focusAngle = 'balanced',
      seed = Date.now(),
      batchIndex = 1,
    }: GenerateQuizRequest = req.body;

    if (!content && !fileData?.data) {
      return res.status(400).json({
        error: 'Please provide either document text or an uploaded file.',
      });
    }

    const typeDescriptions: Record<string, string> = {
      multiple_choice: 'Multiple Choice with 4 distinct options (1 correct answer)',
      true_false: 'True or False question with exactly 2 options ("True" and "False")',
      multiple_answer: 'Multiple Answer question with 4-5 options where 2 or more options are correct',
      fill_blank: 'Fill in the Blank / Identification question where the user types the exact key term or phrase (options array empty, correctAnswer array has acceptable string answers)',
    };

    const requestedTypesStr = questionTypes
      .map((t) => typeDescriptions[t] || t)
      .join('; ');

    const toneInstructions: Record<string, string> = {
      fun: 'Energetic, engaging, and witty. Keep explanations clear, fascinating, and memorable.',
      game_show: 'Exciting, high-stakes game show style. Vibrant prompts and enthusiastic feedback.',
      academic: 'Scholarly, precise, rigorous, with thorough conceptual explanations and citations.',
      direct: 'Crisp, concise, clear, and focused on core principles.',
    };

    const angleInstructions: Record<string, string> = {
      balanced: 'Cover a balanced, representative cross-section of the entire document.',
      deep_dive: 'Focus on in-depth nuances, subtle distinctions, technical mechanisms, fine details, and edge cases.',
      practical: 'Focus on real-world applications, problem-solving scenarios, cause-and-effect relationships, and practical interpretations.',
      quick_recall: 'Focus on key vocabulary definitions, crucial milestones, specific metrics, and foundational terminology.',
      random_shuffle: 'Explore unexpected paragraphs, secondary points, and surprising angles with maximum diversity.',
    };

    const sanitizedNumQuestions = Math.min(
      50,
      Math.max(1, Math.round(Number(numQuestions)) || 10)
    );

    const avoidListText =
      avoidQuestions && avoidQuestions.length > 0
        ? `\nCRITICAL ANTI-DUPLICATION & NOVELTY INSTRUCTION:\nThe user has already generated previous quizzes from this document. You MUST NOT repeat, rephrase, or ask about the exact same facts as the following questions. Focus on DIFFERENT paragraphs, alternate sentences, unexplored concepts, and distinct angles from the document:\n${avoidQuestions
            .slice(0, 50)
            .map((q, idx) => `  ${idx + 1}. "${q}"`)
            .join('\n')}\n`
        : '';

    const promptText = `
You are an expert quiz master and instructional designer. Your task is to generate a high-quality, fun, and engaging quiz strictly based on the provided document content.

SPECIFICATIONS:
- Number of Questions: EXACTLY ${sanitizedNumQuestions} questions.
- Difficulty Level: ${difficulty.toUpperCase()}.
  * If "easy": Focus on direct recall, core definitions, and primary facts stated clearly.
  * If "medium": Focus on conceptual understanding, cause-and-effect, and practical scenarios.
  * If "hard": Focus on analytical reasoning, subtle distinctions, synthesis, edge cases, and evaluating implications.
  * If "mixed": Include a balanced progression of ~30% easy, ~40% medium, ~30% hard.
- Allowed Question Types:
  ${requestedTypesStr}
  * Distribute the questions across the selected types evenly.
- Tone: ${toneInstructions[tone] || toneInstructions.fun}
- Focus Angle (Batch #${batchIndex}): ${angleInstructions[focusAngle] || angleInstructions.balanced}
${avoidListText}
- Document Grounding: Every question MUST be answerable from the information in the provided document. Do NOT hallucinate information not present or directly inferable.
- Formats & Shuffling:
  * For "multiple_choice": Exactly 4 plausible options. Only 1 correct. Correct answer MUST be in options. Randomize the position of the correct answer so it does NOT always appear in the same position (distribute across A, B, C, D).
  * For "true_false": Exactly 2 options: ["True", "False"]. Correct answer must be either "True" or "False". Distribute True and False evenly.
  * For "multiple_answer": 4 or 5 options. 2 or more are correct. correctAnswer array contains all correct strings.
  * For "fill_blank": question must contain "_____" indicating the missing term. Options should be empty array []. correctAnswer contains the exact word(s).
- Explanations & Hints:
  * Provide a helpful hint for each question that steers the user without giving it away entirely.
  * Provide an insightful explanation for each question explaining why the correct answer is right and why distractors are wrong.
  * Provide a short source quote or passage context from the document.
- Randomization Seed: ${seed}
`;

    const contents: any[] = [];

    // Multimodal input if file is supplied (PDF, image, etc.)
    if (fileData?.data && fileData?.mimeType) {
      contents.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType,
        },
      });
    }

    if (content) {
      contents.push({
        text: `DOCUMENT TEXT:\n"""\n${content}\n"""`,
      });
    }

    contents.push({
      text: promptText,
    });

    const generateParams: any = {
      model: 'gemini-3.1-flash-lite',
      contents: contents.length === 1 ? contents[0] : { parts: contents },
      config: {
        systemInstruction:
          'You are DocuQuiz, the world’s most engaging educational quiz creator. Create accurate, pedagogically sound, and enjoyable interactive quizzes from user-provided study materials. Ensure every quiz batch feels fresh, diverse, and well-shuffled.',
        temperature: 0.85, // Elevated temperature ensures varied questions on repeat runs
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'An appealing title for the quiz based on the document topic',
            },
            topic: {
              type: Type.STRING,
              description: 'Primary subject category, e.g. Astronomy, Computer Science, Biology',
            },
            summary: {
              type: Type.STRING,
              description: 'A 1-2 sentence overview of what this quiz tests',
            },
            estimatedTimeMinutes: {
              type: Type.INTEGER,
              description: 'Estimated minutes to complete this quiz',
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    description: 'One of: multiple_choice, true_false, multiple_answer, fill_blank',
                  },
                  difficulty: {
                    type: Type.STRING,
                    description: 'One of: easy, medium, hard',
                  },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'List of choices. Empty array for fill_blank.',
                  },
                  correctAnswer: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of valid correct answers.',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Detailed explanation of the correct solution.',
                  },
                  hint: {
                    type: Type.STRING,
                    description: 'Clue to assist the user.',
                  },
                  sourceQuote: {
                    type: Type.STRING,
                    description: 'Relevant quote or passage from the document.',
                  },
                },
                required: [
                  'id',
                  'type',
                  'difficulty',
                  'question',
                  'options',
                  'correctAnswer',
                  'explanation',
                  'hint',
                ],
              },
            },
          },
          required: ['title', 'topic', 'summary', 'estimatedTimeMinutes', 'questions'],
        },
      },
    };

    let response;
    try {
      response = await ai.models.generateContent(generateParams);
    } catch (primaryErr: any) {
      console.warn('Fast model failed, retrying with gemini-3.8-flash...', primaryErr.message);
      const fallbackParams = {
        ...generateParams,
        model: 'gemini-3.8-flash',
        config: {
          ...generateParams.config,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      };
      response = await ai.models.generateContent(fallbackParams);
    }

    const text = response.text;
    if (!text) {
      throw new Error('Gemini did not return any text response.');
    }

    const quizData = JSON.parse(text);

    // Randomize question sequence and option order to guarantee fresh, non-linear presentation
    if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      // Fisher-Yates shuffle on questions array
      for (let i = quizData.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizData.questions[i], quizData.questions[j]] = [quizData.questions[j], quizData.questions[i]];
      }

      // Re-index questions and randomize option order for multiple-choice
      quizData.questions.forEach((q: any, idx: number) => {
        q.id = `q_${Date.now()}_${idx + 1}`;
        if (q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length > 1) {
          for (let i = q.options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
          }
        }
      });
    }

    return res.json({ success: true, quiz: quizData });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate quiz. Please check your document and try again.',
    });
  }
});

// Deep explanation / AI Coach follow-up endpoint
app.post('/api/explain-deeply', async (req, res) => {
  try {
    const { question, userAnswer, correctAnswer, explanation, context } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `
You are a friendly educational tutor. A student just answered a quiz question and wants a deeper, intuitive breakdown.

Question: "${question}"
Student's Answer: "${userAnswer}"
Correct Answer: "${correctAnswer}"
Standard Explanation: "${explanation}"
Context snippet: "${context || ''}"

Provide:
1. "The Core Concept": A clear, memorable mental model or real-world analogy.
2. "Why the Confusion Happens": Why the student's answer or common distractor was tempting.
3. "Pro Memory Trick": A quick mnemonic or rule of thumb to never forget this.
Keep it fun, encouraging, and under 180 words.
      `,
    });

    return res.json({ success: true, explanation: response.text });
  } catch (error: any) {
    console.error('Error explaining question:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate deep explanation' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuQuiz server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

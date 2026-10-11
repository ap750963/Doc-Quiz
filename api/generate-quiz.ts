import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function handler(req: any, res: any) {
  // CORS & OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    } = req.body || {};

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
      .map((t: string) => typeDescriptions[t] || t)
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
            .map((q: string, idx: number) => `  ${idx + 1}. "${q}"`)
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
        temperature: 0.85,
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
      console.warn('Fast model failed on Vercel, retrying with gemini-3.8-flash...', primaryErr.message);
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

    return res.status(200).json({ success: true, quiz: quizData });
  } catch (error: any) {
    console.error('Error generating quiz on Vercel:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate quiz. Please check your document and try again.',
    });
  }
}

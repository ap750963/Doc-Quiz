import { GoogleGenAI } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { question, userAnswer, correctAnswer, explanation, context } = req.body || {};

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: true,
        explanation: `### Core Concept Breakdown\n\n**Question:** ${question}\n\n**Correct Answer:** ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}\n\n**Why this is correct:** ${explanation || 'Matches verified facts from your source document.'}\n\n**Pro Memory Trick:** Associate this term directly with the central theme of your notes for instant recall!`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    return res.status(200).json({ success: true, explanation: response.text });
  } catch (error: any) {
    console.error('Error explaining question on Vercel:', error);
    return res.status(200).json({
      success: true,
      explanation: `### Quick Insight\n\n**Correct Answer:** ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}\n\n**Explanation:** ${explanation || 'Matches the core facts from the source study document.'}`,
    });
  }
}

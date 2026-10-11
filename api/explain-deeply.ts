import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

  try {
    const { question, userAnswer, correctAnswer, explanation, context } = req.body || {};

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

    return res.status(200).json({ success: true, explanation: response.text });
  } catch (error: any) {
    console.error('Error explaining question on Vercel:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate deep explanation' });
  }
}

// frontend/api/analyze.js - Vercel Serverless Function for NotePilot AI Analysis
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'NotePilot AI Serverless Backend',
      supported_commands: ['QUERY_FACTUAL', 'SUMMARIZE', 'TRANSLATE', 'REWRITE', 'PROOFREAD'],
      gemini_configured: Boolean(process.env.GEMINI_API_KEY)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, text, question, command = 'QUERY_FACTUAL', output_language = 'en', outputLanguage } = req.body || {};
    const context = text || '';
    const queryQuestion = question || prompt || '';
    const lang = output_language || outputLanguage || 'en';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'AI service is not configured (missing GEMINI_API_KEY on server environment).'
      });
    }

    let constructedPrompt = '';
    if (command === 'SUMMARIZE') {
      constructedPrompt = `Summarize the following text clearly and concisely, highlighting key points in bullet points:\n\n${context || queryQuestion}`;
    } else if (command === 'TRANSLATE') {
      constructedPrompt = `Translate the following text accurately into ${lang}. Return only the translated text:\n\n${context || queryQuestion}`;
    } else if (command === 'PROOFREAD') {
      constructedPrompt = `Proofread the following text. Correct spelling, punctuation, and grammar mistakes while keeping original structure. Return only the corrected text:\n\n${context || queryQuestion}`;
    } else if (command === 'REWRITE') {
      constructedPrompt = `Rewrite and polish the following text for clarity and professional tone:\n\n${context || queryQuestion}`;
    } else if (context) {
      constructedPrompt = `You are NotePilot AI. Using the provided note context, answer the user's question accurately.\n\nNote Context:\n${context}\n\nQuestion: ${queryQuestion}`;
    } else {
      constructedPrompt = queryQuestion || 'Hello! How can I assist you with your notes today?';
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: constructedPrompt }] }]
      })
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Gemini API returned status ${geminiRes.status}`;
      return res.status(502).json({ error: errMsg });
    }

    const data = await geminiRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({
      status: 'success',
      command,
      answer: answer.trim(),
      source: 'NotePilot AI Engine (Gemini Cloud Serverless)'
    });
  } catch (error) {
    console.error('Serverless AI error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

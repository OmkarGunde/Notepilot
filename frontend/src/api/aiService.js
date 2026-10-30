/* global globalThis */

// frontend/src/api/aiService.js

// Backend API URL detection:
// 1. In production, ignore expired/dead Railway URLs that may be baked into Vercel build settings.
// 2. Default to relative /api/analyze so Vercel Serverless Function serves requests.
// 3. In local dev (localhost), default to http://localhost:8000.
const rawApiUrl = process.env.REACT_APP_API_URL || '';
const isRailwayDead = rawApiUrl.includes('railway.app');
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Primary backend endpoint for AI calls
const PRIMARY_API_URL = (!isRailwayDead && rawApiUrl)
  ? `${rawApiUrl.replace(/\/+$/, '')}/api/analyze`
  : (isLocalhost ? 'http://localhost:8000/api/analyze' : '/api/analyze');

// Serverless fallback URL on same origin
const SERVERLESS_API_URL = '/api/analyze';

// Client-side fallback key (only if explicitly set in environment, never hardcoded)
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

/**
 * Executes a call with a timeout using AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Direct call to Google Gemini REST API as a robust fallback
 */
async function callDirectGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured for direct browser calls.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }, 15000);

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text;
}

/**
 * Universal NotePilot AI Runner.
 * 1. Checks Chrome Built-in AI (Gemini Nano) first.
 * 2. Attempts PRIMARY_API_URL (/api/analyze or local Python server).
 * 3. Falls back to Vercel Serverless Function (/api/analyze) if primary failed.
 * 4. Falls back to direct Gemini API if client key is configured.
 *
 * Returns: { success: boolean, text: string, error?: string, source: string }
 */
export async function notePilotAI({ prompt, command = "QUERY_FACTUAL", outputLanguage = "en", context = "" }) {
  if (!prompt && !context) {
    return {
      success: false,
      text: "",
      error: "Prompt or content cannot be empty.",
      source: "Validation"
    };
  }

  // 1. PRIMARY: Chrome Built-in On-Device AI (Gemini Nano)
  if (typeof globalThis !== 'undefined' && 'LanguageModel' in globalThis && globalThis.LanguageModel.create) {
    try {
      console.log("[AI Engine]: Trying On-Device LanguageModel...");
      const session = await globalThis.LanguageModel.create({ outputLanguage });
      let resultText = "";

      if (command === "SUMMARIZE") {
        resultText = await session.prompt("Summarize the following clearly and concisely:\n\n" + (context || prompt));
      } else if (command === "TRANSLATE") {
        resultText = await session.prompt(`Translate the following to ${outputLanguage}:\n\n` + (context || prompt));
      } else if (command === "REWRITE") {
        resultText = await session.prompt("Rewrite and improve the following text:\n\n" + (context || prompt));
      } else if (command === "PROOFREAD") {
        resultText = await session.prompt("Proofread and correct spelling and grammar mistakes in this text:\n\n" + (context || prompt));
      } else {
        resultText = await session.prompt(prompt);
      }

      if (resultText && resultText.trim()) {
        return {
          success: true,
          text: resultText.trim(),
          source: "On-Device AI (Chrome Nano)"
        };
      }
    } catch (nanoErr) {
      console.warn("On-device AI not available or failed, using cloud engine:", nanoErr.message);
    }
  }

  // 2. SECONDARY: Primary Backend (/api/analyze or local dev)
  const endpointsToTry = [PRIMARY_API_URL];
  if (PRIMARY_API_URL !== SERVERLESS_API_URL && !endpointsToTry.includes(SERVERLESS_API_URL)) {
    endpointsToTry.push(SERVERLESS_API_URL);
  }

  let lastBackendError = null;

  for (const endpoint of endpointsToTry) {
    try {
      console.log(`[AI Engine]: Connecting to NotePilot Backend at ${endpoint}...`);
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: context || prompt,
          question: prompt,
          command: command,
          output_language: outputLanguage
        })
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        const answer = data.answer || data.result;
        if (answer) {
          return {
            success: true,
            text: answer.trim(),
            source: data.source || "NotePilot Cloud AI"
          };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 503) {
          lastBackendError = "AI service is reachable, but GEMINI_API_KEY is not configured in Vercel project environment variables. Please add GEMINI_API_KEY in your Vercel dashboard.";
        } else {
          lastBackendError = errJson.error || errJson.detail || `Server returned HTTP ${response.status}`;
        }
        console.warn(`[AI Engine] ${endpoint} returned HTTP ${response.status}:`, lastBackendError);
      }
    } catch (backendErr) {
      console.warn(`[AI Engine] Connection to ${endpoint} failed:`, backendErr.message);
      lastBackendError = backendErr.message;
    }
  }

  // 3. TERTIARY: Direct Gemini Fallback (if GEMINI_API_KEY is configured in client)
  if (GEMINI_API_KEY) {
    console.log("[AI Engine]: Using Direct Gemini Cloud Fallback...");
    try {
      let fullPrompt = "";
      if (command === "SUMMARIZE") {
        fullPrompt = `Summarize the following text clearly and concisely, maintaining the key points in bullet points or paragraphs:\n\n${context || prompt}`;
      } else if (command === "TRANSLATE") {
        fullPrompt = `Translate the following text accurately into ${outputLanguage}. Only return the translation:\n\n${context || prompt}`;
      } else if (command === "PROOFREAD") {
        fullPrompt = `Proofread the following text. Fix all spelling, grammar, punctuation, and typographical mistakes while preserving original tone. Only return the corrected text:\n\n${context || prompt}`;
      } else if (command === "REWRITE") {
        fullPrompt = `Rewrite and polish the following text for clarity, professional tone, and eloquence:\n\n${context || prompt}`;
      } else if (context) {
        fullPrompt = `You are NotePilot AI. Use the provided note context to answer the user's question clearly.\n\nNote Context:\n${context}\n\nQuestion:\n${prompt}`;
      } else {
        fullPrompt = `You are NotePilot AI, an intelligent study and note-taking assistant. Answer the user's question clearly and helpfully:\n\n${prompt}`;
      }

      const answer = await callDirectGemini(fullPrompt);
      return {
        success: true,
        text: answer.trim(),
        source: "NotePilot AI Engine (Gemini Cloud Direct)"
      };
    } catch (directErr) {
      console.error("Direct Gemini fallback failed:", directErr.message);
    }
  }

  // If all failed, provide a clean, user-friendly diagnostic message
  const errorMsg = lastBackendError
    ? (lastBackendError.includes("GEMINI_API_KEY") 
        ? "AI service is reachable, but GEMINI_API_KEY is missing from Vercel environment variables. Please add GEMINI_API_KEY in Vercel Project Settings > Environment Variables."
        : `AI backend error: ${lastBackendError}. Click retry to try again.`)
    : "AI backend service is currently offline or unreachable. Please verify server deployment and click retry.";

  return {
    success: false,
    text: "",
    error: errorMsg,
    source: "Error"
  };
}

// Helper exports
export const aiChat = async (prompt, context = "") => {
  return await notePilotAI({
    prompt,
    context,
    command: "QUERY_FACTUAL"
  });
};

export const aiSummarize = async (text) => {
  return await notePilotAI({
    prompt: "Summarize this note",
    context: text,
    command: "SUMMARIZE"
  });
};

export const aiTranslate = async (text, lang = "hi") => {
  return await notePilotAI({
    prompt: `Translate to ${lang}`,
    context: text,
    command: "TRANSLATE",
    outputLanguage: lang
  });
};

export const aiProofread = async (text) => {
  return await notePilotAI({
    prompt: "Proofread this note",
    context: text,
    command: "PROOFREAD"
  });
};

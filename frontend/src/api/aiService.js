/* global globalThis, LanguageModel */ 

// frontend/src/api/aiService.js

// This is your FastAPI backend, which has the *real* Gemini key
//const FASTAPI_URL = 'http://localhost:8000/api/analyze';
const FASTAPI_URL = 'https://notepilot-backend-bzgv.onrender.com/api/analyze';

/**
 * Universal AI function.
 * 1. Tries Chrome Built-in AI (LanguageModel/Nano) first.
 * 2. Falls back to your FastAPI backend if Nano is unavailable.
 */
async function notePilotAI({ prompt, command, outputLanguage = "en" }) {
  
  // 1. PRIMARY: Try Chrome Built-in AI (Gemini Nano)
  if ('LanguageModel' in globalThis && LanguageModel.create) {
    try {
      console.log("[Client AI]: LanguageModel available. Using On-Device Nano.");
      const session = await LanguageModel.create({ outputLanguage });
      
      if (command === "SUMMARIZE") return await session.prompt("Summarize: " + prompt);
      if (command === "TRANSLATE") return await session.prompt("Translate to " + outputLanguage + ": " + prompt);
      if (command === "REWRITE") return await session.prompt("Rewrite: " + prompt);
      // --- NEW PROOFREAD COMMAND ---
      if (command === "PROOFREAD") return await session.prompt("Proofread and correct this text: " + prompt);
      // -----------------------------
      return await session.prompt(prompt); // Default Q&A

    } catch (err) {
      console.warn("Chrome built-in AI errored, falling back to cloud:", err.message);
    }
  }

  // 2. FALLBACK: Use your FastAPI Backend
  console.log("[Cloud Fallback]: LanguageModel not found. Calling FastAPI backend.");
  try {
    const response = await fetch(FASTAPI_URL, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: prompt,
        question: prompt,
        command: command,
        output_language: outputLanguage
      })
    });
    
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const result = await response.json();
    return result.answer || "No response from backend.";

  } catch (err) {
    return `❌ AI Fallback Error: ${err.message}`;
  }
}

// Export specific functions for components to use
export const aiChat = (prompt) => notePilotAI({ 
  prompt, 
  command: "QUERY_FACTUAL" 
});

export const aiSummarize = (prompt) => notePilotAI({ 
  prompt, 
  command: "SUMMARIZE" 
});

export const aiTranslate = (prompt, lang = "hi") => notePilotAI({ 
  prompt, 
  command: "TRANSLATE", 
  outputLanguage: lang 
});

// --- NEW PROOFREAD EXPORT ---
export const aiProofread = (prompt) => notePilotAI({
  prompt,
  command: "PROOFREAD"
});
// ----------------------------
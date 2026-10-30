# NotePilot 🚀
> Smart, AI-Powered Study & Note-Taking Workspace with Seamless Cloud Sync

[![Production Deployment](https://img.shields.io/badge/Production-Live-success?style=flat-square)](https://notepilot-orcin.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20MUI%20v7-blue?style=flat-square)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-009688?style=flat-square)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat-square)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?style=flat-square)](https://ai.google.dev/)

**NotePilot** is a modern note-taking application designed for students, researchers, and professionals. It combines rich-text editing with Gemini AI assistance, intelligent OCR document extraction, multi-lingual translation, accessibility-focused text-to-speech, and resilient local & cloud autosave.

---

## 🌟 Key Features

- **Rich Text & Markdown Editing**: Powered by TipTap, supporting headings, bullet lists, formatting, and live word/character counters.
- **Multimodal AI Assistance**:
  - **Summarize**: Generate clean bullet-point summaries of lengthy notes.
  - **Proofread**: Polish spelling, grammar, and typography.
  - **Rewrite & Tone Adjustment**: Elevate clarity and academic or professional tone.
  - **Multilingual Translation**: Instant translation across English, Hindi, Spanish, French, Japanese, and more.
  - **Contextual Study Chat**: Ask factual questions directly against the content of your current note or notebook.
- **OCR Document Ingestion**: Drag-and-drop scanned images or PDF lab manuals with automated OCR text extraction and AI cleaning.
- **Resilient Save & Recovery Pipeline**:
  - Zero-data-loss debounced autosave writing to Supabase PostgreSQL.
  - Automatic browser local-storage draft backup with one-click restore on reload or accidental disconnect.
  - Explicit "Discard & Go Back" safeguard with local draft cleanup.
- **Accessible & Responsive UX**:
  - Fully responsive across desktop, tablet, and mobile viewports (tested at 320px, 390px, 768px, and 1440px).
  - Material-UI dialogs replacing native blocking prompts and alerts.
  - Persistent Dark / Light theme preference with system scheme fallback.
  - Speech synthesis (TTS) with configurable accents and speeds.
  - Try Demo Workspace with preloaded sample notebooks (no account required).

---

## 🏗️ Architecture

```
NotePilot/
├── api/                      # Vercel Serverless Functions (/api/analyze, /api/health)
│   ├── analyze.js            # Server-side Gemini AI proxy (safeguards secrets)
│   └── health.js             # Uptime & health check endpoint
├── frontend/                 # React 18 Single Page Application
│   ├── src/
│   │   ├── api/              # Supabase & AI client services
│   │   ├── components/       # NoteEditor, NotebookSidebar, NoteList, AIChat, Auth
│   │   ├── App.js            # Main application layout, theme & routing
│   │   └── index.js
│   ├── public/
│   └── package.json
├── backend/                  # FastAPI Cloud Backend (Python)
│   ├── main.py               # REST API endpoints & OCR pipeline
│   ├── ai_service.py         # Google Gemini generative integration
│   ├── supabase_service.py   # Database client integration
│   ├── requirements.txt      # Python dependencies
│   ├── nixpacks.toml         # Deployment configuration
│   └── .env.example          # Sample environment variables
└── requirements.txt          # Root Python dependencies manifest (UTF-8)
```

---

## 🔒 Security & Privacy

- **Zero Client-Side Secrets**: Gemini API keys and sensitive database secrets are stored strictly in server-side environment variables (`process.env.GEMINI_API_KEY`). No secrets are bundled into client JavaScript.
- **Safe Rendering**: All AI responses and chat content are parsed and sanitized via safe React Markdown rendering, eliminating `dangerouslySetInnerHTML` risks.
- **Account Isolation**: Built on Supabase Row Level Security (RLS) ensuring strict cross-account user data isolation.

---

## 🚀 Quick Start

### 1. Frontend Development

```bash
cd frontend
npm install
npm start
```

The application runs on `http://localhost:3000`.

### 2. Backend Development (FastAPI)

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_KEY, and GEMINI_API_KEY in .env

uvicorn main:app --reload --port 8000
```

Backend API runs on `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

---

## 🌐 Production Deployment

- **Live Frontend**: [https://notepilot-orcin.vercel.app/](https://notepilot-orcin.vercel.app/)
- **Repository**: [https://github.com/OmkarGunde/Notepilot](https://github.com/OmkarGunde/Notepilot)

---

## 📄 License

MIT License. Designed and developed by [Omkar Gunde](https://github.com/OmkarGunde).

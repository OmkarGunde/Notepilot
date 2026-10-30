# NotePilot Frontend

This directory contains the React 18 single-page application for **NotePilot**, styled with Material-UI v7 and TipTap rich-text editing.

## Scripts

- `npm start`: Runs the development server on `http://localhost:3000`.
- `npm run build`: Compiles production bundle with code optimization and minification into `build/`.
- `npm test`: Executes the test suite.

## Environment Variables

Create `.env.local` inside `frontend/` to configure local variables:

```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_API_URL=http://localhost:8000
```

> **Security Note**: Never commit API keys or production secrets to frontend code. In production, AI requests are routed through `/api/analyze` to keep credentials server-side.

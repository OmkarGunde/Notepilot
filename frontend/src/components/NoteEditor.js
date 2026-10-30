// frontend/src/components/NoteEditor.js

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box, TextField, Button, Typography, CircularProgress, Paper,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
  Alert, Chip
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { aiSummarize, aiTranslate, aiProofread } from '../api/aiService';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RestorePageIcon from '@mui/icons-material/RestorePage';
import TiptapEditor from './TiptapEditor';
import Tesseract from 'tesseract.js';
import { saveAs } from 'file-saver';

// Helper to sanitize text before inserting into editor
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Convert HTML to clean formatted plain text preserving paragraphs and lists (Issue 17)
function htmlToFormattedText(html) {
  if (!html) return '';
  let str = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n');
  const temp = document.createElement('div');
  temp.innerHTML = str;
  return (temp.textContent || temp.innerText || '').trim();
}

// Convert HTML to clean Markdown (Issue 17)
function htmlToMarkdown(html, noteTitle) {
  if (!html) return `# ${noteTitle || 'Untitled Note'}\n\n`;
  let md = `# ${noteTitle || 'Untitled Note'}\n\n`;
  let processed = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const temp = document.createElement('div');
  temp.innerHTML = processed;
  md += (temp.textContent || temp.innerText || '').trim();
  return md;
}

// Enhanced Text-to-Speech Hook
function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState('');

  const speakText = (text, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) {
      setSpeechError("Your browser does not support Speech Synthesis.");
      return;
    }
    if (!text || !text.trim()) return;
    setSpeechError('');
    window.speechSynthesis.cancel();
    const cleanText = htmlToFormattedText(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return { isSpeaking, speakText, stopSpeaking, speechError, setSpeechError };
}

export default function NoteEditor({ note, onSave, onAutoSave, onDirtyChange }) {
  const [title, setTitle] = useState(note ? note.title : '');
  const [content, setContent] = useState(note ? note.content : '');
  const [loading, setLoading] = useState(false);
  // Brand-new empty notes should not display "Saved" before any save occurs
  const [saveStatus, setSaveStatus] = useState(note?.id ? 'saved' : ''); // '' | 'saved' | 'saving' | 'dirty' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // AI Output state
  const [aiOutput, setAiOutput] = useState({ title: '', text: '', isError: false, lastCommand: null });
  const [targetLang, setTargetLang] = useState('hi');
  const [ttsLang, setTtsLang] = useState('en-US');
  const { isSpeaking, speakText, stopSpeaking, speechError, setSpeechError } = useSpeech();

  // File upload state & errors (Issue 14)
  const [uploadError, setUploadError] = useState('');
  const [uploadingFileName, setUploadingFileName] = useState('');

  // Recoverable local draft state (Issue 4)
  const [recoveredDraft, setRecoveredDraft] = useState(null);

  // Refs for tracking changes and avoiding redundant autosaves (Issue 2)
  const lastSavedTitleRef = useRef(note ? note.title : '');
  const lastSavedContentRef = useRef(note ? note.content : '');
  const noteIdRef = useRef(note ? note.id : null);
  const notebookIdRef = useRef(note ? note.notebook_id : null);

  // Draft local storage key
  const draftKey = `notepilot_draft_${note?.id || note?.notebook_id || 'new'}`;

  // Check for local draft recovery on mount if note is fresh (Issue 4)
  useEffect(() => {
    try {
      const savedDraftJson = localStorage.getItem(draftKey);
      if (savedDraftJson) {
        const parsed = JSON.parse(savedDraftJson);
        // Only offer recovery if draft has content and differs from initial note
        if (parsed && (parsed.content || parsed.title)) {
          const isDifferent = parsed.title !== (note?.title || '') || parsed.content !== (note?.content || '');
          if (isDifferent) {
            setRecoveredDraft(parsed);
          }
        }
      }
    } catch (e) {
      console.warn("Could not check local draft:", e);
    }
  }, [draftKey, note]);

  // Sync internal state when a different note is selected
  useEffect(() => {
    setTitle(note ? note.title : '');
    setContent(note ? note.content : '');
    lastSavedTitleRef.current = note ? note.title : '';
    lastSavedContentRef.current = note ? note.content : '';
    noteIdRef.current = note ? note.id : null;
    notebookIdRef.current = note ? note.notebook_id : null;
    setSaveStatus(note?.id ? 'saved' : '');
    setAiOutput({ title: '', text: '', isError: false, lastCommand: null });
    setUploadError('');
    if (onDirtyChange) onDirtyChange(false);
  }, [note, onDirtyChange]);

  // Determine if content changed since last save
  const isDirty = title !== lastSavedTitleRef.current || content !== lastSavedContentRef.current;

  useEffect(() => {
    if (isDirty) {
      if (saveStatus !== 'saving') {
        setSaveStatus('dirty');
      }
      if (onDirtyChange) onDirtyChange(true);

      // Back up to localStorage (Issue 4)
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          title,
          content,
          notebook_id: notebookIdRef.current,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {
        // quota exceeded or private browsing
      }
    } else {
      if (saveStatus === 'dirty') {
        setSaveStatus('saved');
      }
      if (onDirtyChange) onDirtyChange(false);
    }
  }, [title, content, isDirty, saveStatus, onDirtyChange, draftKey]);

  // DEBOUNCED AUTOSAVE (Issue 2)
  // Only fires when content actually changed, and does NOT loop on idle!
  useEffect(() => {
    // If not dirty, or already saving, do not trigger
    if (!isDirty) return;

    const timer = setTimeout(async () => {
      // Autosave for existing saved notes OR local drafts
      if (noteIdRef.current && onAutoSave) {
        setSaveStatus('saving');
        try {
          const success = await onAutoSave({
            ...note,
            title: title.trim() || 'Untitled Note',
            content
          });
          if (success !== false) {
            lastSavedTitleRef.current = title;
            lastSavedContentRef.current = content;
            setSaveStatus('saved');
            if (onDirtyChange) onDirtyChange(false);
          } else {
            setSaveStatus('error');
            setSaveErrorMessage('Autosave failed. Check connection.');
          }
        } catch (err) {
          setSaveStatus('error');
          setSaveErrorMessage('Autosave error.');
        }
      }
    }, 2500); // 2.5-second stable debounce

    return () => clearTimeout(timer);
  }, [title, content, isDirty, note, onAutoSave, onDirtyChange]);

  // Handle Manual Save & Close
  const handleSaveAndClose = async () => {
    const finalTitle = title.trim() || 'Untitled Note';
    setSaveStatus('saving');
    try {
      const result = await onSave({
        ...note,
        title: finalTitle,
        content
      });
      if (result !== false) {
        // Clear local draft upon confirmed save
        localStorage.removeItem(draftKey);
        lastSavedTitleRef.current = finalTitle;
        lastSavedContentRef.current = content;
        setSaveStatus('saved');
        if (onDirtyChange) onDirtyChange(false);
      } else {
        setSaveStatus('error');
        setSaveErrorMessage('Save failed. Draft was preserved.');
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveErrorMessage(err.message || 'Save error');
    }
  };

  // Restore Recovered Draft
  const handleApplyDraft = () => {
    if (recoveredDraft) {
      setTitle(recoveredDraft.title || '');
      setContent(recoveredDraft.content || '');
      setRecoveredDraft(null);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(draftKey);
    setRecoveredDraft(null);
  };

  /* ----------------------------- 📁 File Upload (Issue 14 & 6) ----------------------------- */
  const handleFileUpload = useCallback(async (file) => {
    // 10MB file size limit validation (Issue 14)
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`"${file.name}" is too large. Maximum supported file size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploadError('');
    setUploadingFileName(file.name);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Ignore dead Railway URL
      const rawApiUrl = process.env.REACT_APP_API_URL || '';
      const isDeadRailway = rawApiUrl.includes('railway.app');
      const API_BASE_URL = (!isDeadRailway && rawApiUrl)
        ? rawApiUrl
        : (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${API_BASE_URL}/api/upload_and_analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${response.status})`);
      }

      const result = await response.json();
      if (result.ocr_text) {
        // Safe escaping of file name and OCR content (Issue 6)
        const safeName = escapeHtml(file.name);
        const safeText = escapeHtml(result.ocr_text).replace(/\n/g, '<br>');
        const fileHtml = `<h3>📄 Document: ${safeName}</h3><p>${safeText}</p><br>`;
        setContent(prev => (prev ? prev + '<br>' + fileHtml : fileHtml));
      } else {
        setUploadError(`File "${file.name}" processed, but no readable text could be extracted.`);
      }
    } catch (error) {
      if (file.type.startsWith('image/')) {
        try {
          console.log("[OCR]: Processing image via browser Tesseract engine...");
          const tesseractResult = await Tesseract.recognize(file, 'eng');
          const extracted = tesseractResult?.data?.text?.trim();
          if (extracted) {
            const safeName = escapeHtml(file.name);
            const safeText = escapeHtml(extracted).replace(/\n/g, '<br>');
            const fileHtml = `<h3>📄 Document: ${safeName}</h3><p>${safeText}</p><br>`;
            setContent(prev => (prev ? prev + '<br>' + fileHtml : fileHtml));
            return;
          }
        } catch (ocrErr) {
          console.warn("Client OCR failed:", ocrErr.message);
        }
      }
      setUploadError(file.type === 'application/pdf'
        ? `PDF extraction requires an active backend server. Please upload an image or text file.`
        : `Could not extract text from "${file.name}".`);
    } finally {
      setLoading(false);
      setUploadingFileName('');
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    setUploadError('');

    acceptedFiles.forEach(file => {
      // Check file types safely
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = () => {
          const safeName = escapeHtml(file.name);
          const safeContent = escapeHtml(reader.result).replace(/\n/g, '<br>');
          const textHtml = `<h3>📄 File: ${safeName}</h3><p>${safeContent}</p><br>`;
          setContent(prev => (prev ? prev + '<br>' + textHtml : textHtml));
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        handleFileUpload(file);
      } else {
        setUploadError(`Unsupported file "${file.name}". Please upload TXT, Markdown, PDF, or Image files.`);
      }
    });
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024
  });

  /* ------------------------------- 🤖 AI Actions (Issue 1, 13) ---------------------------- */
  const runAiAction = async (actionType, titleLabel, apiCall) => {
    const plainText = htmlToFormattedText(content);
    if (!plainText.trim()) {
      setUploadError(`Note content is empty. Add some text first before using ${titleLabel}.`);
      return;
    }
    setUploadError('');
    setLoading(true);
    setAiOutput({ title: titleLabel, text: 'Thinking and generating...', isError: false, lastCommand: actionType });

    try {
      const res = await apiCall(plainText);
      if (res && res.success) {
        setAiOutput({ title: titleLabel, text: res.text, isError: false, lastCommand: actionType });
      } else {
        setAiOutput({
          title: `${titleLabel} Error`,
          text: res?.error || 'AI generation failed. Please check network connection.',
          isError: true,
          lastCommand: actionType
        });
      }
    } catch (err) {
      setAiOutput({
        title: `${titleLabel} Error`,
        text: `Error: ${err.message || 'Unable to connect to AI engine.'}`,
        isError: true,
        lastCommand: actionType
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = () => runAiAction('SUMMARIZE', 'AI Summary', aiSummarize);
  const handleProofread = () => runAiAction('PROOFREAD', 'AI Proofread & Polish', aiProofread);
  const handleTranslate = () => runAiAction('TRANSLATE', `AI Translation (${targetLang.toUpperCase()})`, (t) => aiTranslate(t, targetLang));

  // Only append valid AI output to note (Issue 1)
  const handleAppendToNote = () => {
    if (!aiOutput.text || aiOutput.isError) return;
    const htmlFromMarkdown = marked.parse(aiOutput.text);
    const htmlToAppend = `<hr><h3>${escapeHtml(aiOutput.title)}</h3>${htmlFromMarkdown}`;
    setContent(prev => (prev ? prev + '<br>' + htmlToAppend : htmlToAppend));
    setAiOutput({ title: '', text: '', isError: false, lastCommand: null });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  /* ----------------------------- 💾 Formatted Exports (Issue 17) -------------------------- */
  const handleExportTXT = () => {
    const formatted = htmlToFormattedText(content);
    const safeTitle = (title.trim() || 'Untitled Note').replace(/[^a-z0-9_-]/gi, '_');
    const blob = new Blob([`${title || 'Untitled Note'}\n\n${formatted}`], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${safeTitle}.txt`);
  };

  const handleExportMD = () => {
    const md = htmlToMarkdown(content, title.trim());
    const safeTitle = (title.trim() || 'Untitled Note').replace(/[^a-z0-9_-]/gi, '_');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${safeTitle}.md`);
  };

  // Word & Character count
  const plainText = htmlToFormattedText(content);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = plainText.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* Draft Recovery Notification Banner (Issue 4) */}
      {recoveredDraft && (
        <Alert
          severity="info"
          icon={<RestorePageIcon />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={handleApplyDraft} sx={{ fontWeight: 600 }}>
                Restore Draft
              </Button>
              <Button color="inherit" size="small" onClick={handleDiscardDraft}>
                Discard
              </Button>
            </Box>
          }
          sx={{ borderRadius: 2 }}
        >
          An unsaved local draft for this note was recovered. Would you like to restore it?
        </Alert>
      )}

      {/* Inline speech synthesis error banner (replaces native alert) */}
      {speechError && (
        <Alert severity="warning" onClose={() => setSpeechError('')} sx={{ borderRadius: 2 }}>
          {speechError}
        </Alert>
      )}

      {/* Header bar with title, status and word count */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <TextField
          label="Note Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          disabled={loading}
        />
      </Box>

      {/* Editor */}
      <Box
        sx={{
          border: '1px solid #ddd',
          borderRadius: 2,
          p: 1,
          mb: 2,
          bgcolor: 'background.paper',
          minHeight: '200px',
        }}
      >
        <TiptapEditor
          content={content}
          onChange={(newContent) => setContent(newContent)}
          editable={!loading}
        />
      </Box>

      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #aaa',
          borderRadius: 2,
          p: 2,
          mb: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.default',
        }}
      >
        <input {...getInputProps()} />
        <Typography>
          {uploadingFileName
            ? `Uploading and extracting "${uploadingFileName}"...`
            : isDragActive
            ? 'Drop your file here...'
            : 'Drag & drop files (PDF, Image, Txt), or click to select'}
        </Typography>
      </Box>

      {uploadError && (
        <Alert severity="warning" onClose={() => setUploadError('')} sx={{ mb: 2 }}>
          {uploadError}
        </Alert>
      )}

      {/* Core Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleSaveAndClose} disabled={loading}>
            Save & Close
          </Button>
          <Button variant="outlined" onClick={handleSummarize} disabled={loading}>
            Summarize
          </Button>
          <Button variant="outlined" onClick={handleProofread} disabled={loading}>
            Proofread
          </Button>

          {/* Status Badge */}
          {saveStatus === 'saved' && (
            <Chip icon={<CheckCircleOutlineIcon sx={{ fontSize: '1rem !important' }} />} label="Saved" size="small" color="success" variant="outlined" />
          )}
          {saveStatus === 'saving' && (
            <Chip icon={<CircularProgress size={12} color="inherit" />} label="Saving..." size="small" color="primary" variant="outlined" />
          )}
          {saveStatus === 'dirty' && (
            <Chip icon={<SyncIcon sx={{ fontSize: '1rem !important' }} />} label="Unsaved changes" size="small" color="warning" variant="outlined" />
          )}
          {saveStatus === 'error' && (
            <Chip icon={<CloudOffIcon sx={{ fontSize: '1rem !important' }} />} label={saveErrorMessage || "Save failed"} size="small" color="error" />
          )}

          <Typography variant="caption" color="text.secondary">
            {wordCount} {wordCount === 1 ? 'word' : 'words'} • {charCount} chars
          </Typography>

          {loading && <CircularProgress size={22} />}
        </Box>

        {/* Translate */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={handleTranslate} disabled={loading}>
            Translate (AI)
          </Button>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="lang-select-label">AI Language</InputLabel>
            <Select
              labelId="lang-select-label"
              value={targetLang}
              label="AI Language"
              onChange={(e) => setTargetLang(e.target.value)}
            >
              <MenuItem value="hi">Hindi</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
              <MenuItem value="ja">Japanese</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* TTS */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {!isSpeaking ? (
            <Button variant="outlined" onClick={() => speakText(content, ttsLang)} disabled={loading}>
              🔊 Speak
            </Button>
          ) : (
            <Button variant="outlined" color="error" onClick={stopSpeaking}>
              ⏹ Stop
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="tts-lang-select">TTS Language</InputLabel>
            <Select
              labelId="tts-lang-select"
              value={ttsLang}
              label="TTS Language"
              onChange={(e) => setTtsLang(e.target.value)}
            >
              <MenuItem value="en-US">English (US)</MenuItem>
              <MenuItem value="en-IN">English (India)</MenuItem>
              <MenuItem value="hi-IN">Hindi</MenuItem>
              <MenuItem value="ja-JP">Japanese</MenuItem>
              <MenuItem value="es-ES">Spanish</MenuItem>
              <MenuItem value="fr-FR">French</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Export Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', pt: 1, borderTop: '1px solid', borderColor: 'divider', mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>Export as:</Typography>
          <Button variant="outlined" color="secondary" onClick={handleExportTXT} disabled={loading}>
            .txt
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleExportMD} disabled={loading}>
            .md
          </Button>
        </Box>
      </Box>

      {/* AI Output Result Box (Issue 1, 13) */}
      {aiOutput.text && (
        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            bgcolor: aiOutput.isError ? 'error.light' : 'background.paper',
            color: aiOutput.isError ? 'error.contrastText' : 'text.primary',
            border: '1px solid',
            borderColor: aiOutput.isError ? 'error.main' : 'divider'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {aiOutput.title}
            </Typography>

            {/* ONLY show Append to Note for SUCCESSFUL responses, never for errors (Issue 1) */}
            {!aiOutput.isError ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAppendToNote}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Append to Note
                </Button>
                <Tooltip title="Copy to Clipboard">
                  <IconButton size="small" onClick={() => handleCopy(aiOutput.text)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {aiOutput.lastCommand && (
                  <Button
                    size="small"
                    variant="contained"
                    color="inherit"
                    onClick={() => {
                      if (aiOutput.lastCommand === 'SUMMARIZE') handleSummarize();
                      else if (aiOutput.lastCommand === 'PROOFREAD') handleProofread();
                      else if (aiOutput.lastCommand === 'TRANSLATE') handleTranslate();
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Retry
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {aiOutput.isError ? (
            <Typography variant="body2">{aiOutput.text}</Typography>
          ) : (
            <Box sx={{ '& p': { m: 0, mb: 1 }, '& p:last-child': { mb: 0 }, '& ul, & ol': { pl: 2.5 } }}>
              <ReactMarkdown>{aiOutput.text}</ReactMarkdown>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
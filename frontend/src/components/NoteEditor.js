// frontend/src/components/NoteEditor.js

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, TextField, Button, Typography, List, ListItem, CircularProgress, Paper,
  FormControl, InputLabel, Select, MenuItem, IconButton
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import { aiSummarize, aiTranslate, aiProofread } from '../api/aiService';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TiptapEditor from './TiptapEditor';

// --- ADDED: Import saveAs ---
import { saveAs } from 'file-saver'; 

/* -------------------------------------------------------------------------- */
/* 🧠 Enhanced Text-to-Speech Hook (with Language Selector)                   */
/* -------------------------------------------------------------------------- */
function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakText = (text, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) {
      alert("Your browser doesn't support Text-to-Speech.");
      return;
    }
    if (!text || text.trim() === '') return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === lang);
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { isSpeaking, speakText, stopSpeaking };
}

// Helper to strip HTML for TXT export and AI prompts
function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

/* -------------------------------------------------------------------------- */
/* ✨ Main Note Editor Component                                              */
/* -------------------------------------------------------------------------- */
export default function NoteEditor({ note, onSave, onAutoSave }) {
  const [title, setTitle] = useState(note ? note.title : '');
  const [content, setContent] = useState(note ? note.content : '');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState({ title: '', text: '' });
  const [targetLang, setTargetLang] = useState('hi');
  const [ttsLang, setTtsLang] = useState('en-US');
  const { isSpeaking, speakText, stopSpeaking } = useSpeech();

  // --- Auto-Save Effect (DEBOUNCE) ---
  useEffect(() => {
    if (!note || !note.id || !onAutoSave) { 
      return;
    }
    const timer = setTimeout(() => {
      console.log("Auto-saving note...");
      onAutoSave({ ...note, title, content });
    }, 2000); // 2-second debounce
    return () => {
      clearTimeout(timer);
    };
  }, [title, content, note, onAutoSave]);
  // ------------------------------------

  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    setTitle(note ? note.title : '');
    setContent(note ? note.content : '');
    setFiles([]);
    setAiOutput({ title: '', text: '' });
  }, [note]);

  /* ----------------------------- 📁 File Upload ----------------------------- */
  const handleFileUpload = async (file) => {
    setLoading(true);
    setFiles(prev => [...prev, file]);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/upload_and_analyze', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Server error');
      }
      const result = await response.json();
      if (result.ocr_text) {
        const fileHtml = `<h3>--- ${file.name} Content ---</h3><p>${result.ocr_text.replace(/\n/g, '<br>')}</p>`;
        setContent(prev => prev + fileHtml);
      } else {
        alert('File processed, but no text was extracted.');
      }
    } catch (error) {
      alert(`Error uploading file: ${error.message}`);
      setFiles(prev => prev.filter(f => f.name !== file.name));
    }
    setLoading(false);
  };

  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      if (file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const textHtml = `<p>${(reader.result).replace(/\n/g, '<br>')}</p>`;
          setContent(prev => prev + textHtml);
          setFiles(prevFiles => [...prevFiles, file]);
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        handleFileUpload(file);
      } else {
        alert('Unsupported file type. Upload text, PDF, or image files only.');
      }
    });
  }, [handleFileUpload]); 

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  /* ------------------------------- 🤖 AI Actions ---------------------------- */
  const handleSummarize = async () => {
    const cleanContent = stripHtml(content);
    if (!cleanContent.trim()) return alert('No content to summarize.');
    setLoading(true);
    setAiOutput({ title: 'AI Summary', text: 'Generating...' });
    const summary = await aiSummarize(cleanContent);
    if (summary) setAiOutput({ title: 'AI Summary', text: summary });
    setLoading(false);
  };
  const handleTranslate = async () => {
    const cleanContent = stripHtml(content);
    if (!cleanContent.trim()) return alert('No content to translate.');
    setLoading(true);
    const langName = targetLang.toUpperCase();
    setAiOutput({ title: `AI Translation (${langName})`, text: 'Generating...' });
    const translation = await aiTranslate(cleanContent, targetLang);
    if (translation) setAiOutput({ title: `AI Translation (${langName})`, text: translation });
    setLoading(false);
  };
  const handleProofread = async () => {
    const cleanContent = stripHtml(content);
    if (!cleanContent.trim()) return alert('No content to proofread.');
    setLoading(true);
    setAiOutput({ title: 'Proofread Version', text: 'Generating...' });
    const correctedText = await aiProofread(cleanContent);
    if (correctedText) setAiOutput({ title: 'Proofread Version', text: correctedText });
    setLoading(false);
  };
  const handleAppendToNote = () => {
    if (!aiOutput.text) return;
    const htmlFromMarkdown = marked.parse(aiOutput.text);
    const htmlToAppend = `<h3>${aiOutput.title}</h3>${htmlFromMarkdown}`;
    setContent(prev => prev + htmlToAppend);
    setAiOutput({ title: '', text: '' });
  };
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  /* -----------------------------  EXPORT HANDLERS -------------------------- */
  const handleExportTXT = () => {
    const plainText = stripHtml(content); // Use our helper
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${title || 'NotePilot Note'}.txt`);
  };
  /* -------------------------------------------------------------------------- */

  /* ---------------------------- 🎨 Component UI ----------------------------- */
  return (
    <Box sx={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
      {/* Title */}
      <TextField
        label="Note Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
        disabled={loading}
      />

      {/* Editor */}
      <Box
        sx={{
          flex: 1, overflowY: 'auto', border: '1px solid #ddd',
          borderRadius: 2, p: 1, mb: 2, bgcolor: 'background.paper',
          maxHeight: '60vh',
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
          border: '2px dashed #aaa', borderRadius: 2, p: 2, mb: 2,
          textAlign: 'center', cursor: 'pointer',
          bgcolor: isDragActive ? 'background.paper' : 'background.default',
        }}
      >
        <input {...getInputProps()} />
        <Typography>
          {isDragActive
            ? 'Drop your file here...'
            : 'Drag & drop files (PDF, Image, Txt), or click to select'}
        </Typography>
      </Box>

      {files.length > 0 && (
        <List>{files.map(file => <ListItem key={file.name}>{file.name}</ListItem>)}</List>
      )}

      {/* Core Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => onSave({ ...note, title, content })} disabled={loading}>
            Save & Close
          </Button>
          <Button variant="outlined" onClick={handleSummarize} disabled={loading}>
            Summarize
          </Button>
          <Button variant="outlined" onClick={handleProofread} disabled={loading}>
            Proofread
          </Button>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', pt: 1, borderTop: '1px solid #eee', mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#444' }}>Export as:</Typography>
          <Button variant="outlined" color="secondary" onClick={handleExportTXT} disabled={loading}>
            .txt
          </Button>
        </Box>
      </Box>

      {/* AI Output */}
      {aiOutput.text && (
        <Paper
          sx={{
            p: 2, mt: 2, bgcolor: 'background.paper',
            position: 'relative',
            maxHeight: '35vh',
            overflowY: 'auto',
            '& p': { margin: 0 },
            '& ul, & ol': { paddingLeft: '20px' },
          }}
        >
          <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleAppendToNote}
              startIcon={<AddCircleOutlineIcon />}
              sx={{ textTransform: 'none' }}
            >
              Append to Note
            </Button>
            <IconButton size="small" onClick={() => handleCopy(aiOutput.text)} sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
            {!isSpeaking ? (
              <Button size="small" onClick={() => speakText(aiOutput.text, ttsLang)}>
                🔊 Speak
              </Button>
            ) : (
              <Button size="small" color="error" onClick={stopSpeaking}>
                ⏹ Stop
              </Button>
            )}
          </Box>

          <Typography variant="h6" component="h3" gutterBottom>
            {aiOutput.title}
          </Typography>
          <ReactMarkdown>{aiOutput.text}</ReactMarkdown>
        </Paper>
      )}
    </Box>
  );
}
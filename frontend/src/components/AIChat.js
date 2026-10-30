// frontend/src/components/AIChat.js

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, IconButton,
  CircularProgress, Tooltip, useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReactMarkdown from 'react-markdown';

export default function AIChat({ onSendMessage, contextTitle = "" }) {
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: contextTitle
        ? `Hi! I'm NotePilot AI. I have context for "${contextTitle}". Ask me anything about this note or for study help!`
        : "Hi! I'm NotePilot AI. Ask me general questions, study tips, or how to organize your notes.",
      isError: false
    }
  ]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatBoxRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages, isPending]);

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query.trim() || isPending) return;

    const userMsg = { role: 'user', text: query.trim(), isError: false };
    setChatMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsPending(true);

    try {
      const response = await onSendMessage(query.trim());
      
      // Check if response is structured object or string
      let text = '';
      let isError = false;

      if (typeof response === 'object' && response !== null) {
        if (response.success) {
          text = response.text;
        } else {
          text = response.error || 'Failed to get a response from AI.';
          isError = true;
        }
      } else if (typeof response === 'string') {
        if (response.startsWith('❌')) {
          text = response;
          isError = true;
        } else {
          text = response;
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text,
          isError,
          lastQuery: query.trim()
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `AI connection error: ${err.message || 'Unable to reach service'}.`,
          isError: true,
          lastQuery: query.trim()
        }
      ]);
    } finally {
      setIsPending(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRetry = (msg) => {
    if (msg.lastQuery) {
      handleSend(msg.lastQuery);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 280,
        maxHeight: { xs: 350, md: 450 }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>
            NotePilot AI Assistant
          </Typography>
        </Box>
        {contextTitle && (
          <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, py: 0.3, borderRadius: 1 }}>
            Note: {contextTitle.slice(0, 20)}
          </Typography>
        )}
      </Box>

      {/* Messages Scroll Area */}
      <Box
        ref={chatBoxRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mb: 0.3,
                  fontSize: '0.75rem',
                  color: 'text.secondary'
                }}
              >
                {isUser ? (
                  <>
                    <span>You</span>
                    <PersonOutlineIcon sx={{ fontSize: '0.9rem' }} />
                  </>
                ) : (
                  <>
                    <SmartToyOutlinedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                    <span>NotePilot AI</span>
                  </>
                )}
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  maxWidth: '85%',
                  position: 'relative',
                  bgcolor: isUser
                    ? 'primary.main'
                    : msg.isError
                    ? 'error.light'
                    : theme.palette.mode === 'dark'
                    ? 'grey.900'
                    : 'grey.100',
                  color: isUser
                    ? 'primary.contrastText'
                    : msg.isError
                    ? 'error.contrastText'
                    : 'text.primary',
                  wordBreak: 'break-word',
                  '& p': { m: 0, mb: 0.5 },
                  '& p:last-child': { mb: 0 },
                  '& code': {
                    bgcolor: 'rgba(0,0,0,0.15)',
                    px: 0.5,
                    borderRadius: 0.5,
                    fontSize: '0.85em'
                  }
                }}
              >
                {/* Safe Markdown rendering instead of dangerouslySetInnerHTML (Issue 6) */}
                {isUser ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Typography>
                ) : msg.isError ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {msg.text}
                    </Typography>
                    {msg.lastQuery && (
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<ReplayIcon />}
                        onClick={() => handleRetry(msg)}
                        disabled={isPending}
                        sx={{ mt: 1, textTransform: 'none', bgcolor: 'rgba(255,255,255,0.2)' }}
                      >
                        Retry
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ pr: 2 }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </Box>
                )}

                {!isUser && !msg.isError && (
                  <Tooltip title={copiedIndex === idx ? 'Copied!' : 'Copy Response'}>
                    <IconButton
                      size="small"
                      aria-label="Copy AI response"
                      onClick={() => handleCopy(msg.text, idx)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        color: 'text.secondary',
                        p: 0.5
                      }}
                    >
                      {copiedIndex === idx ? <CheckIcon sx={{ fontSize: '1rem' }} /> : <ContentCopyIcon sx={{ fontSize: '1rem' }} />}
                    </IconButton>
                  </Tooltip>
                )}
              </Paper>
            </Box>
          );
        })}

        {/* Loading Indicator */}
        {isPending && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', p: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption">Thinking and processing...</Typography>
          </Box>
        )}
      </Box>

      {/* Input Field & Send Button */}
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        sx={{
          display: 'flex',
          gap: 1,
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <TextField
          placeholder="Ask AI anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          size="small"
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!input.trim() || isPending}
          aria-label="Send message"
          sx={{
            minWidth: 44,
            px: 2,
            borderRadius: 2,
            textTransform: 'none'
          }}
        >
          {isPending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
        </Button>
      </Box>
    </Paper>
  );
}
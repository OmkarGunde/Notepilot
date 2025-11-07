// frontend/src/components/AIChat.js

import * as React from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
// import ReactMarkdown from 'react-markdown'; // We're using dangerouslySetInnerHTML

export default function AIChat({ onSendMessage }) {
  const [input, setInput] = React.useState('');
  
  // --- THIS IS THE FIX ---
  // The component now manages its own state for chat messages
  // and initializes it as an empty array [].
  const [chatMessages, setChatMessages] = React.useState([]); 
  const chatBoxRef = React.useRef(null);
  // -----------------------

  React.useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setChatMessages(prev => [...prev, userMsg]); // Add to local state

    const answer = await onSendMessage(input); 
    const aiMsg = { role: 'assistant', text: answer };
    setChatMessages(prev => [...prev, aiMsg]); // Add to local state

    setInput('');
  };

  const handleCopy = (text) => navigator.clipboard.writeText(text);

  return (
    <Box sx={{ p: 2, bgcolor: "#fff", mt: 2, borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        💬 AI Chat (General Knowledge)
      </Typography>

      <Box ref={chatBoxRef} sx={{ maxHeight: 250, overflow: "auto", mb: 1, p: 1 }}>
        {/* --- THIS NOW READS FROM LOCAL STATE, WHICH IS NEVER UNDEFINED --- */}
        {chatMessages.map((msg, idx) => (
          <Paper
            key={idx}
            sx={{
              p: 1.5,
              mb: 1,
              bgcolor: msg.role === "user" ? "#e3f2fd" : "#f0f4c3",
              position: 'relative',
              "& p": { margin: 0 },
              "& ul, &ol": { paddingLeft: "20px" }
            }}
          >
            <b>{msg.role === "user" ? "You" : "AI"}:</b>
            {msg.role === "assistant" ? (
              <>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(msg.text)}
                  sx={{ position: 'absolute', top: 4, right: 4 }}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              </>
            ) : (
              <Typography component="span" sx={{ whiteSpace: 'pre-wrap' }}> {msg.text}</Typography>
            )}
          </Paper>
        ))}
      </Box>

      <TextField
        placeholder="Ask anything..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        sx={{ width: "calc(100% - 80px)" }}
        size="small"
      />
      <Button onClick={handleSend} variant="contained" sx={{ ml: 1, height: '40px' }}>Send</Button>
    </Box>
  );
}
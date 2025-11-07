// frontend/src/components/NoteList.js

import * as React from 'react';
import { 
  Grid, Card, CardContent, Typography, IconButton, Button, 
  Paper, Box, List, ListItem, ListItemText 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NoteIcon from '@mui/icons-material/Note'; // Icon for list view

// --- 1. NEW HELPER FUNCTION ---
// This robustly strips HTML tags from your Tiptap content for a clean preview
const getPreviewText = (html) => {
  if (!html) return "";
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  // Use textContent to get only the human-readable text
  let text = tempDiv.textContent || tempDiv.innerText || "";
  // Clean up extra whitespace
  return text.replace(/\s+/g, ' ').trim();
}

export default function NoteList({ notes, onSelectNote, onDeleteNote, onAddNote, disabled, viewMode = 'grid' }) {

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 2 }}
        onClick={onAddNote}
        disabled={disabled} 
      >
        Add Note
      </Button>
      {notes.length === 0 && (
        <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
          No notes in this notebook yet. Click "Add Note"!
        </Typography>
      )}

      {/* === 2. GRID VIEW (IMPROVED STYLING) === */}
      {viewMode === 'grid' && (
        <Grid container spacing={2}>
          {notes.map(n => (
            <Grid item xs={12} sm={6} md={4} key={n.id}>
              <Card 
                onClick={() => onSelectNote(n)} 
                sx={{ 
                  cursor: "pointer", 
                  height: 150, // <-- Fixed height for all cards
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'space-between', // Pushes content apart
                  '&:hover': { boxShadow: 4 } // Add hover effect
                }}
              >
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="h6" noWrap>
                    {n.title || "Untitled Note"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{
                      // This ensures text truncates with "..." after 2 lines
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      '-webkit-line-clamp': 2,
                      '-webkit-box-orient': 'vertical',
                  }}>
                    {/* Use the new helper function for a clean preview */}
                    {getPreviewText(n.content) || "No content"}
                  </Typography>
                </CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, pt: 0 }}>
                  <IconButton
                    aria-label="delete"
                    color="error"
                    size="small"
                    onClick={e => { e.stopPropagation(); onDeleteNote(n.id); }}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* === 3. LIST VIEW (Updated to use helper) === */}
      {viewMode === 'list' && (
        <List sx={{ width: '100%' }}>
          {notes.map(n => (
            <Paper 
              key={n.id} 
              elevation={2} 
              sx={{ mb: 1, '&:hover': { bgcolor: '#f9f9f9' } }}
            >
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    color="error"
                    onClick={e => { e.stopPropagation(); onDeleteNote(n.id); }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                onClick={() => onSelectNote(n)}
                sx={{ cursor: 'pointer' }}
              >
                <NoteIcon sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText
                  primary={n.title || "Untitled Note"}
                  // Use the new helper function here too
                  secondary={getPreviewText(n.content).substring(0, 150) + "..."}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </div>
  );
}
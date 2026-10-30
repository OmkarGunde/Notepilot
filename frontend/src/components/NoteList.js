// frontend/src/components/NoteList.js

import React from 'react';
import {
  Grid, Card, CardContent, Typography, IconButton, Button,
  Paper, Box, List, ListItem, ListItemText, Tooltip, Chip
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import AddIcon from '@mui/icons-material/Add';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ScheduleIcon from '@mui/icons-material/Schedule';

// Helper to strip HTML tags for clean card snippet previews
export const getPreviewText = (html) => {
  if (!html) return "";
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || "";
  return text.replace(/\s+/g, ' ').trim();
};

export const getWordCount = (html) => {
  const text = getPreviewText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

export default function NoteList({
  notes = [],
  allNotesCount = 0,
  searchQuery = "",
  onClearSearch,
  onSelectNote,
  onDeleteNote,
  onAddNote,
  hasSelectedNotebook = false,
  notebookName = "",
  viewMode = 'grid'
}) {

  // Case 1: No Notebook Selected (Issue 16)
  if (!hasSelectedNotebook) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: 'background.paper',
          borderStyle: 'dashed'
        }}
      >
        <FolderOpenIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          No Notebook Selected
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>
          Choose a notebook from the sidebar or create a new one to start writing and organizing your notes.
        </Typography>
      </Paper>
    );
  }

  // Case 2: Search with no results (Issue 16)
  if (searchQuery.trim() && notes.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddNote}
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 40 }}
          >
            New Note
          </Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: 'background.paper'
          }}
        >
          <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No matches found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            No notes in "{notebookName}" matched your search for <b>"{searchQuery}"</b>.
          </Typography>
          {onClearSearch && (
            <Button variant="outlined" size="small" onClick={onClearSearch} sx={{ textTransform: 'none' }}>
              Clear Search Filter
            </Button>
          )}
        </Paper>
      </Box>
    );
  }

  // Case 3: Empty Notebook (No notes yet) (Issue 16)
  if (allNotesCount === 0 && notes.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 6,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: 'background.paper',
          borderStyle: 'dashed'
        }}
      >
        <EditNoteIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          "{notebookName}" is Empty
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
          Capture lecture thoughts, meeting highlights, or study notes in this notebook.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={onAddNote}
          sx={{ textTransform: 'none', fontWeight: 600, px: 3, minHeight: 44 }}
        >
          Create First Note
        </Button>
      </Paper>
    );
  }

  // Case 4: Notes exist! Render them
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddNote}
          sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42, px: 2.5, borderRadius: 2 }}
        >
          New Note
        </Button>

        <Typography variant="body2" color="text.secondary">
          Showing {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Typography>
      </Box>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Grid container spacing={2}>
          {notes.map((n) => {
            const preview = getPreviewText(n.content);
            const words = getWordCount(n.content);
            const dateStr = n.created_at || n.updated_at
              ? new Date(n.updated_at || n.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })
              : null;

            return (
              <Grid item xs={12} sm={6} md={4} key={n.id}>
                <Card
                  onClick={() => onSelectNote(n)}
                  elevation={1}
                  sx={{
                    cursor: 'pointer',
                    height: 180,
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                      borderColor: 'primary.light'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2, pb: 1, overflow: 'hidden' }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      noWrap
                      title={n.title || 'Untitled Note'}
                      sx={{ mb: 0.5 }}
                    >
                      {n.title || 'Untitled Note'}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.5,
                        fontSize: '0.86rem'
                      }}
                    >
                      {preview || 'No content yet...'}
                    </Typography>
                  </CardContent>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 2,
                      py: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${words} ${words === 1 ? 'word' : 'words'}`}
                        size="small"
                        sx={{ fontSize: '0.72rem', height: 20 }}
                      />
                      {dateStr && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary', fontSize: '0.72rem' }}>
                          <ScheduleIcon sx={{ fontSize: '0.75rem' }} />
                          <span>{dateStr}</span>
                        </Box>
                      )}
                    </Box>

                    <Tooltip title="Delete note">
                      <IconButton
                        aria-label={`Delete note ${n.title || 'Untitled'}`}
                        color="error"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(n.id);
                        }}
                        sx={{ minWidth: 32, minHeight: 32 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <List sx={{ width: '100%', p: 0 }}>
          {notes.map((n) => {
            const preview = getPreviewText(n.content);
            const words = getWordCount(n.content);
            return (
              <Paper
                key={n.id}
                elevation={1}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 3 }
                }}
              >
                <ListItem
                  onClick={() => onSelectNote(n)}
                  sx={{ cursor: 'pointer', py: 1.5 }}
                  secondaryAction={
                    <Tooltip title="Delete note">
                      <IconButton
                        edge="end"
                        aria-label={`Delete note ${n.title || 'Untitled'}`}
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(n.id);
                        }}
                        sx={{ minWidth: 40, minHeight: 40 }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <NoteAltOutlinedIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} noWrap>
                          {n.title || 'Untitled Note'}
                        </Typography>
                        <Chip
                          label={`${words} words`}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 18 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: 200, sm: 450, md: 600 }
                        }}
                      >
                        {preview || 'Empty note'}
                      </Typography>
                    }
                  />
                </ListItem>
              </Paper>
            );
          })}
        </List>
      )}
    </Box>
  );
}
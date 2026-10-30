// frontend/src/App.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './api/supabaseClient';
import { aiChat } from './api/aiService';
import {
  AppBar, Toolbar, Typography, Box, CssBaseline, Button, TextField,
  ToggleButton, ToggleButtonGroup, IconButton, createTheme, ThemeProvider,
  Tooltip, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Container
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';

import Auth from './components/Auth';
import NotebookSidebar, { DRAWER_WIDTH } from './components/NotebookSidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import AIChat from './components/AIChat';

export default function App() {
  const [session, setSession] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Notebooks & Notes state
  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteView, setNoteView] = useState('grid');

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Editor dirty state for safe draft leaving
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Undo delete snackbar state
  const [deletedNoteUndo, setDeletedNoteUndo] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Theme preference with localStorage persistence & system scheme fallback
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('notepilot_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const handleToggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('notepilot_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#2563eb',
            light: '#60a5fa',
            dark: '#1d4ed8',
          },
          secondary: {
            main: '#7c3aed',
          },
          background: {
            default: darkMode ? '#121212' : '#f8f8ff',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          h5: { fontWeight: 700 },
          h6: { fontWeight: 600 },
        },
      }),
    [darkMode]
  );

  // Auth Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) setIsDemoMode(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Fetch Notebooks
  const fetchNotebooks = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching notebooks:', error.message);
        return;
      }

      setNotebooks(data || []);
      if (data && data.length > 0) {
        setSelectedNotebook(prev => {
          if (!prev) return data[0];
          const exists = data.find(nb => nb.id === prev.id);
          return exists || data[0];
        });
      } else {
        setSelectedNotebook(null);
      }
    } catch (err) {
      console.error('Notebooks fetch error:', err);
    }
  }, [session]);

  // Fetch Notes
  const fetchNotes = useCallback(async () => {
    if (!session || !selectedNotebook) {
      setNotes([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('notebook_id', selectedNotebook.id)
        .eq('user_id', session.user.id)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error.message);
        return;
      }
      setNotes(data || []);
    } catch (err) {
      console.error('Notes fetch error:', err);
    }
  }, [session, selectedNotebook]);

  useEffect(() => {
    if (session) fetchNotebooks();
  }, [session, fetchNotebooks]);

  useEffect(() => {
    if (selectedNotebook && session) {
      fetchNotes();
    } else if (!isDemoMode) {
      setNotes([]);
    }
    setSelectedNote(null);
  }, [selectedNotebook, session, fetchNotes, isDemoMode]);

  // Demo Mode Init
  const handleEnableDemoMode = () => {
    setIsDemoMode(true);
    const demoNotebook = { id: 9999, name: 'Quick Notes (Demo)' };
    const demoNotes = [
      {
        id: 1001,
        title: 'Welcome to NotePilot Demo',
        content: '<p>Welcome! <b>NotePilot</b> helps you organize thoughts and study with AI.</p><ul><li>Use the <b>Summarize</b> or <b>Proofread</b> tools.</li><li>Drag and drop images or PDFs for OCR.</li><li>Translate into 5+ languages.</li></ul>',
        created_at: new Date().toISOString()
      },
      {
        id: 1002,
        title: 'Meeting Checklist & Goals',
        content: '<p>Project review goals:</p><ul><li>Save reliability & draft recovery.</li><li>Responsive mobile navigation.</li><li>Safe markdown rendering.</li></ul>',
        created_at: new Date().toISOString()
      }
    ];
    setNotebooks([demoNotebook]);
    setSelectedNotebook(demoNotebook);
    setNotes(demoNotes);
  };

  // Notebook CRUD
  const handleAddNotebook = async () => {
    const name = prompt("Enter new notebook name:");
    if (!name || !name.trim()) return;

    if (isDemoMode) {
      const newNb = { id: Date.now(), name: name.trim() };
      setNotebooks(prev => [...prev, newNb]);
      setSelectedNotebook(newNb);
      return;
    }

    if (!session) return;
    const { data, error } = await supabase
      .from('notebooks')
      .insert([{ name: name.trim(), user_id: session.user.id }])
      .select();

    if (error) {
      setSnackbar({ open: true, message: `Failed to create notebook: ${error.message}`, severity: 'error' });
      return;
    }

    await fetchNotebooks();
    if (data && data.length > 0) {
      setSelectedNotebook(data[0]);
    }
    setSnackbar({ open: true, message: `Created notebook "${name.trim()}"`, severity: 'success' });
  };

  const handleRenameNotebook = async (notebook) => {
    const newName = prompt("Rename notebook:", notebook.name);
    if (!newName || !newName.trim() || newName.trim() === notebook.name) return;

    if (isDemoMode) {
      setNotebooks(prev => prev.map(nb => nb.id === notebook.id ? { ...nb, name: newName.trim() } : nb));
      if (selectedNotebook?.id === notebook.id) {
        setSelectedNotebook(prev => ({ ...prev, name: newName.trim() }));
      }
      return;
    }

    const { error } = await supabase
      .from('notebooks')
      .update({ name: newName.trim() })
      .eq('id', notebook.id);

    if (error) {
      setSnackbar({ open: true, message: `Failed to rename notebook: ${error.message}`, severity: 'error' });
      return;
    }

    fetchNotebooks();
    setSnackbar({ open: true, message: `Renamed to "${newName.trim()}"`, severity: 'success' });
  };

  const handleDeleteNotebook = async (notebook) => {
    const noteCount = notes.filter(n => n.notebook_id === notebook.id).length;
    const confirmMsg = noteCount > 0
      ? `Are you sure you want to delete "${notebook.name}" and all its ${noteCount} note(s)?`
      : `Are you sure you want to delete "${notebook.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    if (isDemoMode) {
      setNotebooks(prev => prev.filter(nb => nb.id !== notebook.id));
      if (selectedNotebook?.id === notebook.id) setSelectedNotebook(null);
      return;
    }

    try {
      await supabase.from('notes').delete().eq('notebook_id', notebook.id);
      const { error } = await supabase.from('notebooks').delete().eq('id', notebook.id);
      if (error) {
        setSnackbar({ open: true, message: `Failed to delete notebook: ${error.message}`, severity: 'error' });
        return;
      }
      fetchNotebooks();
      setSnackbar({ open: true, message: `Deleted notebook "${notebook.name}"`, severity: 'info' });
    } catch (err) {
      setSnackbar({ open: true, message: `Delete failed: ${err.message}`, severity: 'error' });
    }
  };

  // Safe Save & Close Note
  const handleSaveAndCloseNote = async (noteData) => {
    if (!selectedNotebook) {
      setSnackbar({ open: true, message: "Please select a notebook first.", severity: 'warning' });
      return false;
    }
    if (!noteData.title?.trim() && !noteData.content?.trim()) {
      setSnackbar({ open: true, message: "Cannot save an empty note.", severity: 'warning' });
      return false;
    }

    const titleToSave = noteData.title?.trim() || 'Untitled Note';

    if (isDemoMode) {
      if (!noteData.id) {
        const createdNote = { ...noteData, id: Date.now(), title: titleToSave, created_at: new Date().toISOString() };
        setNotes(prev => [createdNote, ...prev]);
      } else {
        setNotes(prev => prev.map(n => n.id === noteData.id ? { ...n, title: titleToSave, content: noteData.content } : n));
      }
      setIsEditorDirty(false);
      setSelectedNote(null);
      setSnackbar({ open: true, message: "Note saved successfully!", severity: 'success' });
      return true;
    }

    if (!session) return false;

    const notePayload = {
      title: titleToSave,
      content: noteData.content || '',
      notebook_id: selectedNotebook.id,
      user_id: session.user.id
    };

    try {
      if (!noteData.id) {
        const { data, error } = await supabase.from('notes').insert([notePayload]).select();
        if (error) {
          setSnackbar({ open: true, message: `Save failed: ${error.message}. Draft was kept open.`, severity: 'error' });
          return false;
        }
        if (data && data.length > 0) {
          setNotes(prev => [data[0], ...prev]);
        } else {
          fetchNotes();
        }
      } else {
        const { error } = await supabase.from('notes').update(notePayload).eq('id', noteData.id);
        if (error) {
          setSnackbar({ open: true, message: `Save failed: ${error.message}. Draft was kept open.`, severity: 'error' });
          return false;
        }
        setNotes(prev => prev.map(n => n.id === noteData.id ? { ...n, ...notePayload, updated_at: new Date().toISOString() } : n));
      }

      setIsEditorDirty(false);
      setSelectedNote(null);
      setSnackbar({ open: true, message: "Note saved successfully!", severity: 'success' });
      return true;
    } catch (err) {
      setSnackbar({ open: true, message: `Error saving: ${err.message}`, severity: 'error' });
      return false;
    }
  };

  // Stable Auto-Save
  const handleAutoSave = useCallback(async (noteData) => {
    if (!noteData.id || !session) return true;

    if (isDemoMode) {
      setNotes(prev => prev.map(n => n.id === noteData.id ? { ...n, title: noteData.title, content: noteData.content } : n));
      return true;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: noteData.title || 'Untitled Note',
          content: noteData.content || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', noteData.id)
        .eq('user_id', session.user.id);

      if (error) {
        console.warn("Autosave warning:", error.message);
        return false;
      }

      setNotes(prev => prev.map(n => (n.id === noteData.id ? { ...n, title: noteData.title, content: noteData.content } : n)));
      return true;
    } catch (err) {
      console.warn("Autosave network issue:", err);
      return false;
    }
  }, [session, isDemoMode]);

  // Delete note with Recoverable UNDO
  const handleDeleteNote = async (noteId) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) setSelectedNote(null);
    setDeletedNoteUndo(noteToDelete);

    setSnackbar({
      open: true,
      message: `Note "${noteToDelete.title || 'Untitled'}" deleted.`,
      severity: 'info'
    });

    if (!isDemoMode && session) {
      try {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) {
          setNotes(prev => [noteToDelete, ...prev]);
          setSnackbar({ open: true, message: `Could not delete note: ${error.message}`, severity: 'error' });
        }
      } catch (err) {
        setNotes(prev => [noteToDelete, ...prev]);
      }
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedNoteUndo) return;
    const noteToRestore = deletedNoteUndo;
    setDeletedNoteUndo(null);

    if (isDemoMode) {
      setNotes(prev => [noteToRestore, ...prev]);
      setSnackbar({ open: false, message: '', severity: 'info' });
      return;
    }

    if (session) {
      const { data, error } = await supabase.from('notes').insert([{
        title: noteToRestore.title,
        content: noteToRestore.content,
        notebook_id: noteToRestore.notebook_id,
        user_id: session.user.id
      }]).select();

      if (!error && data) {
        setNotes(prev => [data[0], ...prev]);
        setSnackbar({ open: true, message: "Note restored successfully!", severity: 'success' });
      }
    }
  };

  const handleBackToNotes = () => {
    if (isEditorDirty) {
      setConfirmLeaveOpen(true);
    } else {
      setSelectedNote(null);
    }
  };

  const handleAIChatMessage = async (text, context = "") => {
    if (!text || !text.trim()) return;
    return await aiChat(text, context);
  };

  const filteredNotes = notes.filter(note =>
    (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.content && note.content.replace(/<[^>]*>?/gm, '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />

        {/* Global AppBar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {(session || isDemoMode) && (
                <IconButton
                  color="inherit"
                  aria-label="Open notebooks sidebar"
                  edge="start"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  sx={{ display: { md: 'none' }, minWidth: 44, minHeight: 44 }}
                >
                  <MenuIcon />
                </IconButton>
              )}

              <Box
                component="img"
                src="/notepilot_logo.png"
                alt="NotePilot Logo"
                sx={{ height: 32, width: 32, borderRadius: '50%' }}
              />
              <Typography variant="h6" noWrap>
                NotePilot
              </Typography>
              {isDemoMode && (
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                    px: 1,
                    py: 0.2,
                    borderRadius: 1,
                    fontWeight: 700
                  }}
                >
                  DEMO
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                <IconButton
                  onClick={handleToggleTheme}
                  color="inherit"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>

              {session && (
                <Button color="inherit" onClick={() => supabase.auth.signOut()}>
                  Logout
                </Button>
              )}

              {isDemoMode && (
                <Button
                  color="inherit"
                  variant="outlined"
                  size="small"
                  onClick={() => setIsDemoMode(false)}
                >
                  Exit Demo
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Not Logged In: Show Centered Login Card */}
        {!session && !isDemoMode ? (
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
            <Toolbar />
            <Auth onDemoLogin={handleEnableDemoMode} />
          </Box>
        ) : (
          /* Main Workspace */
          <>
            <NotebookSidebar
              notebooks={notebooks}
              selectedNotebook={selectedNotebook}
              onSelectNotebook={setSelectedNotebook}
              onAddNotebook={handleAddNotebook}
              onRenameNotebook={handleRenameNotebook}
              onDeleteNotebook={handleDeleteNotebook}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                bgcolor: 'background.default',
                minHeight: '100vh',
                p: { xs: 2, sm: 3 },
                pl: { xs: 2, sm: 3, md: `${DRAWER_WIDTH}px` },
                boxSizing: 'border-box'
              }}
            >
              <Toolbar />
              <Container maxWidth="md" sx={{ mt: 3 }}>

                {!selectedNote ? (
                  <>
                    {/* Inline AI Chat (General Knowledge) as originally placed */}
                    <AIChat
                      onSendMessage={(text) => handleAIChatMessage(text, "")}
                    />

                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="h5">
                          Notes {selectedNotebook ? `in "${selectedNotebook.name}"` : ""}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <TextField
                            label="Search Notes"
                            variant="outlined"
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <ToggleButtonGroup
                            value={noteView}
                            exclusive
                            onChange={(_e, v) => v && setNoteView(v)}
                            size="small"
                          >
                            <ToggleButton value="grid" aria-label="grid view">
                              <ViewModuleIcon />
                            </ToggleButton>
                            <ToggleButton value="list" aria-label="list view">
                              <ViewListIcon />
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Box>
                      </Box>

                      <NoteList
                        notes={filteredNotes}
                        allNotesCount={notes.length}
                        searchQuery={searchQuery}
                        onClearSearch={() => setSearchQuery('')}
                        onSelectNote={(note) => setSelectedNote(note)}
                        onDeleteNote={handleDeleteNote}
                        onAddNote={() => setSelectedNote({ title: "", content: "", id: null, notebook_id: selectedNotebook?.id })}
                        hasSelectedNotebook={Boolean(selectedNotebook)}
                        notebookName={selectedNotebook ? selectedNotebook.name : ""}
                        viewMode={noteView}
                      />
                    </Box>
                  </>
                ) : (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {selectedNote.id ? "Edit Note" : "Add Note"}
                    </Typography>

                    {/* Inline Note-Aware AI Chat as originally placed */}
                    <AIChat
                      onSendMessage={(text) => handleAIChatMessage(text, selectedNote.content)}
                      contextTitle={selectedNote.title}
                    />

                    <Box sx={{ mt: 2 }}>
                      <NoteEditor
                        note={selectedNote}
                        onSave={handleSaveAndCloseNote}
                        onAutoSave={handleAutoSave}
                        onDirtyChange={setIsEditorDirty}
                      />
                    </Box>

                    <Button
                      onClick={handleBackToNotes}
                      sx={{ mt: 2 }}
                      variant="outlined"
                    >
                      Back to Notes
                    </Button>
                  </Box>
                )}
              </Container>
            </Box>
          </>
        )}

        {/* Unsaved changes confirmation dialog */}
        <Dialog
          open={confirmLeaveOpen}
          onClose={() => setConfirmLeaveOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You have unsaved changes in this draft. Leaving will discard unsaved edits unless you save them first.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmLeaveOpen(false)}>
              Keep Editing
            </Button>
            <Button
              color="error"
              onClick={() => {
                setConfirmLeaveOpen(false);
                setIsEditorDirty(false);
                setSelectedNote(null);
              }}
            >
              Discard & Go Back
            </Button>
          </DialogActions>
        </Dialog>

        {/* Undo Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          action={
            deletedNoteUndo ? (
              <Button color="secondary" size="small" onClick={handleUndoDelete} sx={{ fontWeight: 700 }}>
                UNDO
              </Button>
            ) : null
          }
        >
          <Alert
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

      </Box>
    </ThemeProvider>
  );
}
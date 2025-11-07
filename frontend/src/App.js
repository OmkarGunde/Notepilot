// frontend/src/App.js

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { supabase } from './api/supabaseClient';
import { aiChat } from './api/aiService'; 
import { 
  AppBar, Toolbar, Typography, Container, Box, CssBaseline, Button, TextField, 
  ToggleButton, ToggleButtonGroup, IconButton, createTheme, ThemeProvider 
} from '@mui/material'; // Import Theme components
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
// Import theme icons
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import Auth from './components/Auth';
import NotebookSidebar from './components/NotebookSidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import AIChat from './components/AIChat';

export default function App() {
  const [session, setSession] = useState(null); 
  const [notebooks, setNotebooks] = useState([]);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteView, setNoteView] = useState('grid'); 
  
  // --- 1. ADD DARK MODE STATE ---
  const [darkMode, setDarkMode] = useState(false);

  // --- 2. CREATE THEME BASED ON STATE ---
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          // You can customize your dark/light theme colors here
          background: {
            default: darkMode ? '#121212' : '#f8f8ff', // Dark bg or light bg
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [darkMode],
  );
  // ------------------------------------

  const handleNoteViewChange = (event, newView) => {
    if (newView !== null) { 
      setNoteView(newView);
    }
  };

  // --- Auth Effect ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // --- Data Fetching Effects ---
  useEffect(() => {
    if (session) fetchNotebooks();
  }, [session]);

  useEffect(() => {
    if (selectedNotebook) fetchNotes();
    else setNotes([]);
    setSelectedNote(null);
    // eslint-disable-next-line
  }, [selectedNotebook]);

  // --- Notebook CRUD (No Changes) ---
  const fetchNotebooks = async () => {
    if (!session) return;
    const { data } = await supabase.from('notebooks')
      .select('*')
      .eq('user_id', session.user.id) 
      .order('id', { ascending: true });
    
    setNotebooks(data || []);
    if (!selectedNotebook && data && data.length > 0) {
      setSelectedNotebook(data[0]);
    } else if (!data || data.length === 0) {
      setSelectedNotebook(null);
    }
  };
  const handleAddNotebook = async () => {
    const name = prompt("Enter new notebook name:");
    if (!name || !session) return;
    const { data } = await supabase.from('notebooks').insert([{ name, user_id: session.user.id }]).select();
    await fetchNotebooks();
    if (data && data.length > 0) {
      setSelectedNotebook(data[0]);
    }
  };
  const handleRenameNotebook = async (notebook) => {
    const newName = prompt("Rename notebook:", notebook.name);
    if (!newName || newName === notebook.name) return;
    await supabase.from('notebooks').update({ name: newName }).eq('id', notebook.id);
    fetchNotebooks();
  };
  const handleDeleteNotebook = async (notebook) => {
    if (window.confirm(`Are you sure you want to delete "${notebook.name}" and all its notes?`)) {
      await supabase.from('notes').delete().eq('notebook_id', notebook.id);
      await supabase.from('notebooks').delete().eq('id', notebook.id);
      fetchNotebooks();
    }
  };

  // --- Notes CRUD (No Changes, includes auto-save) ---
  const fetchNotes = async () => {
    if (!selectedNotebook || !session) return setNotes([]);
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('notebook_id', selectedNotebook.id)
      .eq('user_id', session.user.id)
      .order('id', { ascending: false });
    setNotes(data || []);
  };
  const handleSelectNote = (note) => setSelectedNote(note);

  const handleSaveAndCloseNote = async (noteData) => {
    if (!selectedNotebook) {
      alert("Error: Please select or create a notebook before saving a note.");
      return;
    }
    if (!noteData.title || !noteData.content || !session) return;
    
    const notePayload = {
      title: noteData.title,
      content: noteData.content,
      notebook_id: selectedNotebook.id, 
      user_id: session.user.id
    };

    if (!noteData.id) {
      await supabase.from('notes').insert([notePayload]);
    } else {
      await supabase.from('notes').update(notePayload).eq('id', noteData.id);
    }
    setSelectedNote(null); 
    fetchNotes();
  };

  const handleAutoSave = async (noteData) => {
    if (!noteData.id || !noteData.title || !session) return; 

    const notePayload = {
      title: noteData.title,
      content: noteData.content,
    };

    await supabase.from('notes')
      .update(notePayload)
      .eq('id', noteData.id)
      .eq('user_id', session.user.id);
    
    fetchNotes();
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      await supabase.from('notes').delete().eq('id', noteId);
      setSelectedNote(null);
      fetchNotes();
    }
  };

  // --- AI Chat Handler (No Changes) ---
  const handleAIChatMessage = async (text) => {
    if (!text.trim()) return;
    const aiResponse = await aiChat(text); 
    return aiResponse;
  };

  // --- Filtered Notes (No Changes) ---
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content && note.content.replace(/<[^>]*>?/gm, '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- 3. WRAP APP IN THEMEPROVIDER ---
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box 
                component="img"
                src="/notepilot_logo.png" 
                sx={{ height: 32, width: 32, borderRadius: '50%' }} 
              />
              <Typography variant="h6" noWrap>
                NotePilot
              </Typography>
            </Box>

            {/* --- 4. ADD THEME TOGGLE AND LOGOUT BUTTON --- */}
            <Box>
              <IconButton sx={{ ml: 1 }} onClick={() => setDarkMode(!darkMode)} color="inherit">
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
              {session && (
                <Button color="inherit" onClick={() => supabase.auth.signOut()}>Logout</Button>
              )}
            </Box>

          </Toolbar>
        </AppBar>
        
        {/* --- 5. RENDER APP LOGIC --- */}
        {!session ? (
          // Show Login page if no session
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: "100vh", p: 3 }}>
            <Toolbar />
            <Auth />
          </Box>
        ) : (
          // Show Main App if logged in
          <>
            <NotebookSidebar
              notebooks={notebooks}
              selectedNotebook={selectedNotebook}
              onSelectNotebook={setSelectedNotebook}
              onAddNotebook={handleAddNotebook}
              onRenameNotebook={handleRenameNotebook}
              onDeleteNotebook={handleDeleteNotebook}
            />
            
            <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: "100vh", p: 3, pl: '240px' }}>
              <Toolbar />
              <Container maxWidth="md" sx={{ mt: 3 }}>
                
                {!selectedNote ? (
                  <>
                    <AIChat 
                      onSendMessage={(text) => handleAIChatMessage(text, "")}
                    />
                
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 3, flexWrap: 'wrap', gap: 2 }}>
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
                            onChange={handleNoteViewChange}
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
                        onSelectNote={handleSelectNote}
                        onDeleteNote={handleDeleteNote}
                        onAddNote={() => setSelectedNote({ title: "", content: "", id: null })}
                        disabled={!selectedNotebook}
                        viewMode={noteView} 
                      />
                    </Box>
                  </>
                ) : (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6">{selectedNote.id ? "Edit Note" : "Add Note"}</Typography>
                    
                    {/* Note-aware chat */}
                    <AIChat 
                      onSendMessage={(text) => handleAIChatMessage(text, selectedNote.content)}
                    />

                    <NoteEditor
                      note={selectedNote}
                      onSave={handleSaveAndCloseNote}
                      onAutoSave={handleAutoSave}
                    />
                    <Button onClick={() => setSelectedNote(null)} sx={{ mt: 2 }}>
                      Back to Notes
                    </Button>
                  </Box>
                )}
              </Container>
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
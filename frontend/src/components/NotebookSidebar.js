import * as React from 'react';
import { Drawer, Toolbar, List, ListItem, ListItemIcon, ListItemText, IconButton, Divider, Button } from '@mui/material';
import NoteIcon from '@mui/icons-material/Note';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const drawerWidth = 240;

export default function NotebookSidebar({
  notebooks,
  selectedNotebook,
  onSelectNotebook,
  onAddNotebook,
  onRenameNotebook,
  onDeleteNotebook
}) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <List>
        {notebooks.map(notebook => (
          <ListItem
            button
            key={notebook.id}
            selected={selectedNotebook && notebook.id === selectedNotebook.id}
            onClick={() => onSelectNotebook(notebook)}
            secondaryAction={
              <span>
                <IconButton edge="end" size="small" onClick={e => { e.stopPropagation(); onRenameNotebook(notebook); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton edge="end" size="small" onClick={e => { e.stopPropagation(); onDeleteNotebook(notebook); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            }
          >
            <ListItemIcon><NoteIcon /></ListItemIcon>
            <ListItemText primary={notebook.name} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Button sx={{ m: 2 }} variant="contained" onClick={onAddNotebook}>Add Notebook</Button>
    </Drawer>
  );
}

import * as React from 'react';
import {
  Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Divider, Button, Box, Typography, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';

export const DRAWER_WIDTH = 250;

export default function NotebookSidebar({
  notebooks = [],
  selectedNotebook,
  onSelectNotebook,
  onAddNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  mobileOpen = false,
  onMobileClose
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary">
          Notebooks
        </Typography>
        {!isDesktop && (
          <IconButton onClick={onMobileClose} aria-label="Close sidebar" size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />

      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            onAddNotebook();
            if (!isDesktop && onMobileClose) onMobileClose();
          }}
          sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42, borderRadius: 2 }}
        >
          New Notebook
        </Button>
      </Box>

      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
        {notebooks.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notebooks yet. Click "New Notebook" to create one.
            </Typography>
          </Box>
        ) : (
          notebooks.map((notebook) => {
            const isSelected = selectedNotebook && notebook.id === selectedNotebook.id;
            return (
              <ListItemButton
                key={notebook.id}
                selected={isSelected}
                onClick={() => {
                  onSelectNotebook(notebook);
                  if (!isDesktop && onMobileClose) onMobileClose();
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 44,
                  pr: 1
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                  <BookmarksIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={notebook.name}
                  primaryTypographyProps={{
                    fontSize: '0.92rem',
                    fontWeight: isSelected ? 600 : 400,
                    noWrap: true
                  }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Rename Notebook">
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={`Rename ${notebook.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameNotebook(notebook);
                      }}
                      sx={{ minWidth: 32, minHeight: 32 }}
                    >
                      <EditIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Notebook">
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      aria-label={`Delete ${notebook.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotebook(notebook);
                      }}
                      sx={{ minWidth: 32, minHeight: 32 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemButton>
            );
          })
        )}
      </List>

      <Divider />
      <Box sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {notebooks.length} {notebooks.length === 1 ? 'Notebook' : 'Notebooks'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      aria-label="Notebook folders"
    >
      {/* Mobile Drawer (Temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            bgcolor: 'background.paper'
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

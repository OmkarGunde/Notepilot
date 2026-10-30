// frontend/src/components/TiptapEditor.js

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CodeIcon from '@mui/icons-material/Code';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        p: 0.75,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flexWrap: 'wrap'
      }}
    >
      <ToggleButtonGroup size="small" aria-label="Text formatting">
        <ToggleButton
          value="bold"
          selected={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Format bold"
          sx={{ minWidth: 36, minHeight: 36, px: 1 }}
        >
          <FormatBoldIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="italic"
          selected={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Format italic"
          sx={{ minWidth: 36, minHeight: 36, px: 1 }}
        >
          <FormatItalicIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="bulletList"
          selected={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
          sx={{ minWidth: 36, minHeight: 36, px: 1 }}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="code"
          selected={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          aria-label="Inline code"
          sx={{ minWidth: 36, minHeight: 36, px: 1 }}
        >
          <CodeIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

const TiptapEditor = ({ content, onChange, editable = true }) => {
  const theme = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing or paste text here...',
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: editable,
  });

  // Keep content in sync from outside without resetting cursor position
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const isSame = editor.getHTML() === content;
      if (!isSame) {
        editor.commands.setContent(content || '', false);
      }
    }
  }, [content, editor]);

  // Keep editable state in sync
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <MenuBar editor={editor} />
      <Box
        sx={{
          minHeight: '200px',
          p: 2,
          color: 'text.primary',
          fontFamily: 'inherit',
          fontSize: '1rem',
          lineHeight: 1.6,
          '& .tiptap': {
            outline: 'none',
            minHeight: '180px',
            '& p': {
              margin: '0 0 1em 0',
            },
            '& p:last-child': {
              marginBottom: 0,
            },
            '& ul, & ol': {
              paddingLeft: '1.5em',
              margin: '0 0 1em 0',
            },
            '& code': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.9em',
            },
            '& p.is-editor-empty:first-child::before': {
              color: 'text.disabled',
              content: 'attr(data-placeholder)',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            }
          }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default TiptapEditor;
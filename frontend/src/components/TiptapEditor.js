// frontend/src/components/TiptapEditor.js

import React, { useEffect } from 'react'; // Import useEffect
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Box } from '@mui/material';

// --- MenuBar Component (No Changes) ---
const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }
  return (
    <Box sx={{ border: '1px solid #ccc', borderBottom: 'none', p: 1, bgcolor: '#f9f9f9' }}>
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        size="small"
      >
        Bold
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        size="small"
      >
        Italic
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        size="small"
      >
        List
      </Button>
    </Box>
  );
};
const Button = ({ onClick, disabled, children, className }) => (
  <button 
    type="button" 
    onClick={onClick} 
    disabled={disabled}
    style={{ 
      marginRight: '5px', 
      padding: '4px 8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      background: className.includes('is-active') ? '#e0e0e0' : 'white',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);
// --- End MenuBar Component ---


const TiptapEditor = ({ content, onChange, editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    // 1. Set content on initialization ONLY
    content: content, 
    
    // 2. onUpdate handles user typing
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    
    // 3. Set editable status from prop
    editable: editable,
  });

  // --- 4. THIS IS THE FIX ---
  // This effect manually updates the editor's content if the `content` prop
  // changes from the OUTSIDE (e.g., loading a new note or appending AI text).
  // This stops the editor from re-initializing and losing focus.
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Check if the prop content is different from the editor's content
      const isSame = editor.getHTML() === content;
      if (!isSame) {
        // Set the content without triggering the 'onUpdate' callback
        editor.commands.setContent(content, false); 
      }
    }
  }, [content, editor]); // Run this effect only when the 'content' prop changes

  // Update editable status if 'loading' prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <Box sx={{ border: '1px solid #ccc', borderRadius: '4px' }}>
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        style={{ minHeight: '150px', padding: '10px' }} 
      />
    </Box>
  );
};

export default TiptapEditor;
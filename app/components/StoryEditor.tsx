'use client'

import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent } from '@tiptap/react'
import { useEffect, useState, useCallback, useRef } from 'react'

type StoryEditorProps = {
  editable: boolean;
  clearContent: boolean;
  setClearContent: (v: boolean) => void;
  setCurrentlyEditing: (v: boolean) => void;
  onStartEditing?: () => void;
  onContentChange?: (text: string) => void;
  story: {
    id: number;
    created_at: string;
    story_title: string;
    story_content: string;
    room_id: string;
  };
};

const StoryEditor = (props: StoryEditorProps) => {
  const { story, clearContent, setCurrentlyEditing, setClearContent, editable, onStartEditing, onContentChange } = props;

  const [editor, setEditor] = useState<Editor | null>(null);
  const [hasNotifiedEditStart, setHasNotifiedEditStart] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (editor) return;
    if (story?.room_id) {
      const newEditor = new Editor({
        extensions: [
          StarterKit.configure({
            history: false,
          }),
        ],
        editorProps: {
          attributes: {
            class: 'min-h-[400px] p-6 focus:outline-none',
          },
        },
        autofocus: true,
      });

      setEditor(newEditor);
      editorRef.current = newEditor;
    }

    return () => {
      editorRef.current?.destroy();
    };
  }, [story?.room_id]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      if (!editable || clearContent) return;
      if (!hasNotifiedEditStart) {
        setHasNotifiedEditStart(true);
        setCurrentlyEditing(true);
        onStartEditing?.();
      }
      onContentChange?.(editor.getText());
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, hasNotifiedEditStart, onStartEditing, setCurrentlyEditing, editable, clearContent, onContentChange]);

  const handleClear = useCallback(async () => {
    setCurrentlyEditing(false);
    setHasNotifiedEditStart(false);
    await editor?.commands.clearContent(true);
    onContentChange?.('');
    setClearContent(false);
  }, [editor, onContentChange, setClearContent, setCurrentlyEditing]);

  useEffect(() => {
    if (clearContent) {
      handleClear();
    }
  }, [clearContent, handleClear]);

  return (
    <div className="surface">
      <EditorContent editor={editor} />
    </div>
  );
};

export default StoryEditor;
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

  const [hasNotifiedEditStart, setHasNotifiedEditStart] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (editorRef.current) return;
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

      editorRef.current = newEditor;
    }

    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [story?.room_id]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setEditable(editable);
  }, [editable]);

  useEffect(() => {
    const editor = editorRef.current;
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
  }, [hasNotifiedEditStart, onStartEditing, setCurrentlyEditing, editable, clearContent, onContentChange]);

  const handleClear = useCallback(async () => {
    setCurrentlyEditing(false);
    setHasNotifiedEditStart(false);
    await editorRef.current?.commands.clearContent(true);
    onContentChange?.('');
    setClearContent(false);
  }, [onContentChange, setClearContent, setCurrentlyEditing]);

  useEffect(() => {
    if (clearContent) {
      handleClear();
    }
  }, [clearContent, handleClear]);

  return (
    <div className="surface">
      <EditorContent editor={editorRef.current} />
    </div>
  );
};

export default StoryEditor;
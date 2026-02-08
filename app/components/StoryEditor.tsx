'use client'


import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent } from '@tiptap/react'
import { UUID } from 'crypto'
import { useEffect, useState } from 'react'


// const socket = setUpSocket()

type TiptapProps = {
    editable: boolean,
    clearContent: any,
    setClearContent: any,
    setCurrentlyEditing: any,
    onStartEditing?: () => void,
    onContentChange?: (text: string) => void,
    story: {
        id : number,
        created_at: string,
        story_title: string,
        story_content: string,
        room_id: UUID,
    }
}



const StoryEditor = (props: TiptapProps) => {
   
    const { story, clearContent, setCurrentlyEditing, setClearContent, editable, onStartEditing, onContentChange } = props

    const [editor, setEditor] = useState<any>(null)
    const [hasNotifiedEditStart, setHasNotifiedEditStart] = useState(false)


    
    useEffect(() => {
        if(story?.room_id?.length > 0){
            const editor = new Editor({ 
                extensions: [
                    StarterKit.configure({
                        history: false,
                    }),
                ],
                editorProps: {
                    attributes: {
                      class: 'min-h-80 rounded-lg p-4 focus:outline-none bg-white bg-[#FECACA]',
                    },
                },
                autofocus: false,
            })

            setEditor(editor)
        }

        
    }, [])

    useEffect(() => {
        if (!editor) return
        editor.setEditable(editable)
        if(editable){
            editor?.setOptions({
                editorProps: {
                    attributes: {
                    class: 'min-h-80 rounded-2xl p-6 focus:outline-none bg-white border-2 border-dashed border-[#b6ff4b] shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
                    },
                },
                autofocus: false,
            })
        }else{
            editor?.setOptions({
                editorProps: {
                    attributes: {
                    class: 'min-h-80 rounded-2xl p-6 focus:outline-none bg-white/80 border-2 border-dashed border-[#d6cfc6]',
                    },
                },
                autofocus: false,
            })
        
        }
    }, [editable, editor])

    useEffect(() => {
        if (!editor) return
        const handleUpdate = () => {
            if (!editable || clearContent) return
            if (!hasNotifiedEditStart) {
                setHasNotifiedEditStart(true)
                setCurrentlyEditing(true)
                onStartEditing?.()
            }
            onContentChange?.(editor.getText())
        }
        editor.on('update', handleUpdate)
        return () => {
            editor.off('update', handleUpdate)
        }
    }, [editor, hasNotifiedEditStart, onStartEditing, setCurrentlyEditing, editable, clearContent, onContentChange])


    const handleClear = async () => {
        console.log('clearing: Story Editor')
        setCurrentlyEditing(false)
        setHasNotifiedEditStart(false)
        await editor?.commands.clearContent(true)
        onContentChange?.('')
        // socket.emit('clearChannel', {room_id: story.room_id})
        setClearContent(false)
    }

    useEffect(() => {
        if(clearContent){
            handleClear()
        }
    }, [clearContent])

    
    return (
        <>
            <EditorContent editor={editor} className='' />
        </>
    )
}

export default StoryEditor

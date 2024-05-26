'use client'


import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { EditorContent } from '@tiptap/react'
import { UUID } from 'crypto'
import { useEffect, useState } from 'react'
import { setUpSocket } from '@/utils/socket'


const socket = setUpSocket()

type TiptapProps = {
    editable: boolean,
    user : any,
    clearContent: any,
    setClearContent: any,
    setCurrentlyEditing: any,
    story: {
        id : number,
        created_at: string,
        story_title: string,
        story_content: string,
        room_id: UUID,
    }
}

const StoryEditor = (props: TiptapProps) => {
   
    const { story, clearContent, setCurrentlyEditing, setClearContent, user, editable } = props

    const [provider, setProvider] = useState<any>(null)
    const [editor, setEditor] = useState<any>(null)


    
    useEffect(() => {
        if(story?.room_id?.length > 0){

            const provider = new HocuspocusProvider({
                url: 'ws://127.0.0.1:1234',
                name: story.room_id.toString(),
                parameters: {
                    user: user.data.session.user.email,
                    room_id: story.room_id,
                }

            })


            const editor = new Editor({ 
                extensions: [
                    StarterKit.configure({
                        history: false,
                        
                    }),
                    // Register the document with Tiptap
                    Collaboration.configure({
                        document: provider.document,
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
            setProvider(provider)
            
        }

        
    }, [])

    useEffect(() => {
        editor?.setEditable(editable)
        if(editable){
            editor?.setOptions({
                editorProps: {
                    attributes: {
                    class: 'min-h-80 rounded-lg p-4 focus:outline-none bg-white border border-[#c3f680] bg-[#f0f0f0]',
                    },
                },
                autofocus: true,
            })
        }else{
            editor?.setOptions({
                editorProps: {
                    attributes: {
                    class: 'min-h-80 rounded-lg p-4 focus:outline-none bg-white border border-[#FEE2E2] bg-[#f0f0f0]',
                    },
                },
                autofocus: false,
            })
        
        }
    }, [editable, editor])


    const handleClear = async () => {
        console.log('clearing: Story Editor')
        setCurrentlyEditing(false)
        await editor?.commands.clearContent(true)
        socket.emit('clearChannel', {room_id: story.room_id})
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
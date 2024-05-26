'use client'

import { useEffect, useState } from "react"

import StoryEditor from "@/app/components/StoryEditor"
import Header from "@/app/components/Header"


import { setUpSocket } from "@/utils/socket"
import { supabaseClient } from "@/utils/db/supabase"
import { getStory } from "@/utils/db/actions"

import { motion } from "framer-motion"


import Modal from 'react-modal';
import { get } from "http"


const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        // width: '50%',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        background: '#fcfcfc',
        border: '1px solid #dcdddf',
        borderRadius: '10px',
        backdropFilter: 'blur(100px)' 
    },
};

const socket = setUpSocket()

export default function Page({ params }: { params: { room_id: string } }) {
    
    const [story, setStory] = useState<any>([])
    const [user, setUser] = useState<any>(null)
    const [editable, setEditable] = useState<boolean>(true)
    const [currentlyEditing, setCurrentlyEditing] = useState<boolean>(false)
    const [clearContent, setClearContent] = useState<boolean>(false)

    const [content, setContent] = useState<any>({
        "type": "text",
        "text": ""
    })

    const [isOpen, setIsOpen] = useState(false)

    const handleOpenModal = () => {
        setIsOpen(true );
    }

    const closeModal = () => {
        setIsOpen(false);
    }

    const room_id = params.room_id

    const supabase = supabaseClient

    const specialChannelName = 'roomInfo: ' + room_id;
    const saveEditsChannel = 'saveEdits: ' + room_id;

    socket.on(specialChannelName, (data: any) => {
        if(data["activeUser"] && user){
            if(data["activeUser"] !== user.data.session.user.email){
                setEditable(false)
            } else {
                setEditable(true)
                setCurrentlyEditing(true)
            }
        } else {

            // return to default state
            setEditable(true)
            setCurrentlyEditing(false)
        }

        if (data["typedContent"]) {setContent(data["typedContent"])}
    })

    socket.on(saveEditsChannel, (data: any) => {
        getStoryfromDB()
    })

    useEffect(() => {
        getStoryfromDB()
        getUser()
    }, [])
    
    const getStoryfromDB = async () => {
        const Story = await getStory(room_id)
        if(Story){setStory(Story[0])}
    }


    const getUser = async () => {
        const session = await supabase.auth.getSession()
        setUser(session)
    }


    const saveContributionToDB = async (content: string) => {
        const { data, error } = await supabase
            .from('Rooms')
            .update({ story_content: content })
            .eq('room_id', room_id)
        if (error) {
            console.error('Error saving data:', error.message)
            return
        }

    }

    // open up the room for others to edit
    const saveEdits = () => {
        
        saveContributionToDB(story.story_content + '\n' + content[0]?.text)
        setClearContent(true)
        
        closeModal()
        socket.emit('saveEdits', {room_id: room_id})
    }

    const deleteEdits = () => {
        setClearContent(true)
        closeModal()
    }

    console.log("Editable: ", editable), console.log("Currently Editing: ", currentlyEditing)
    

    return (
        <div>
            
            <Header/>
            <Modal isOpen={isOpen} onRequestClose={closeModal} style={customStyles} >
                        <div className="flex items-center justify-center w-full">
                        <div className="text-center p-4">
                            <p className="font-base text-lg ">Are you sure you want to add this to the story?</p>
                            
                            <div className="flex flex-col font-base space-y-4 md:space-y-0 md:space-x-10 md:flex-row md:justify-between mt-6">
                                <button className="justify-center bg-red-300 border-black flex  border  rounded-lg py-2.5 px-7 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out" onClick={deleteEdits}>No, Clear</button>
                                <button className="justify-center bg-[#c3f680]  border-black flex   border  rounded-lg py-2.5 px-7 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out" onClick={saveEdits}>Yes, Save</button>
                            </div>
                        </div>
                        </div>
            </Modal>
            {story.story_content ?
            <div className="bg-[#f9f8f6] min-h-screen flex flex-col px-6 py-2 mb-20">
                <div className="mt-10 font-bold text-3xl px-4">
                    {story.story_title}
                </div>
               
                <div className="mt-2 text-[#866e6e]  rounded w-fit mx-4 p-1 text-center pt-1 text-sm">
                    Genre: {story.genre}
                </div>
                <div className='mt-4 p-4 leading-8 text-normal '>
                    {story.story_content}
                </div>
                <div className="mt-5 mb-4 px-4">
                    <StoryEditor story={story} setCurrentlyEditing={setCurrentlyEditing} clearContent={clearContent} setClearContent={setClearContent} user={user} editable={editable}/>
                </div>
                {currentlyEditing &&
                    <div className="text-[#866e6e] flex text-sm  justify-center px-4 transform transition ease-in">
                        You are currently the only one working on this story, the button below opens up the space for others to contribute to the story when you are done.
                    </div>
                }
                {!editable &&
                <div className="text-[#866e6e] flex text-sm  justify-center px-4 transform transition ease-in">
                    There is another user currently working on this story. The editor will turn green when you can edit.
                </div>
                }
                {editable && !currentlyEditing &&
                    <div className="text-[#866e6e] flex text-sm  justify-center px-4 transform transition ease-in">
                        Type in the editor to add to the story.
                    </div>
                }
                
                {editable && currentlyEditing &&
                        <>
                            <div className="w-full flex justify-center px-4 font-bold mt-5">
                                <motion.div whileHover={{ x: 1 , y: 1}}>
                                    <button onClick={() => setIsOpen(true)} className="p-6 bg-[#c3f680] border-black flex flex-row  border  rounded-lg py-3 px-7 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out">
                                        <p className="pr-2 "> Add to Story </p>
                                    </button>
                                </motion.div>       
                            </div>
                        </>
                }
                
            </div> :
            <div className="min-h-screen flex justify-center items-center animate-ping -mt-36">
                
            </div>
            }
        </div>
    )

   
}


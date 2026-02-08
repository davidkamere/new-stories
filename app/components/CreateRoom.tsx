"use client"

import { useState } from "react";

import { createNewRoom } from "@/utils/db/actions";
import Modal from 'react-modal';
import { motion } from "framer-motion"
import { PlusIcon } from "@heroicons/react/20/solid";


const customStyles = {
    overlay: {
        backgroundColor: 'rgba(10, 10, 8, 0.45)',
        backdropFilter: 'blur(6px)',
        zIndex: 60,
    },
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        zIndex: 61,
    },
};

type CreateRoomProps = {
    getRoomsFromDb: () => void
}

const CreateRoom = (props: CreateRoomProps) => {

    const { getRoomsFromDb } = props

    const [isOpen, setIsOpen] = useState(false)
    
    const [title, setTitle] = useState<string>("")
    const [content, setContent] = useState<string>("")
    const [genre, setGenre] = useState<string>("")
    const [penName, setPenName] = useState<string>("")
    const [isAdultThemeSelected, setIsAdultThemeSelected] = useState(false);


    // Function to handle checkbox change
    const handleCheckboxChange = (event: any) => {
        setIsAdultThemeSelected(event.target.checked);
    };

    const handleOpenModal = () => {
        setIsOpen(true );
    }

    const closeModal = () => {
        setIsOpen(false);
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        const created = await createNewRoom(title, content, genre)
        const roomId = created?.[0]?.room_id
        if (penName && roomId) {
            localStorage.setItem(`penname:${roomId}`, penName)
        }
        getRoomsFromDb()
        closeModal()
    }

    


    return (

        <div >
            {/* Modal to add new details */}
            <Modal
                isOpen={isOpen}
                style={customStyles}
                onRequestClose={closeModal}
            >   
                <form onSubmit={handleSubmit} className="paper-bg rounded-3xl p-6 md:p-10 w-[92vw] max-w-[520px] max-h-[85vh] overflow-y-auto">
                <div className="flex flex-col space-y-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#8f7f74]">New Story</div>
                    <div className="ink-title text-2xl">Start a story</div>
                    <div className="text-sm text-[#8f7f74]">
                        Pick a pen name, a title, and a genre. Your first lines set the tone.
                    </div>
                    <div className="text-sm text-[#8f7f74]">Your pen name</div>
                    <input
                        type="text"
                        id="penName"
                        placeholder="Pen name"
                        value={penName}
                        onChange={(e) => setPenName(e.target.value)}
                        required
                        className="border bg-white border-[#d7d0c7] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#b6ff4b] placeholder:font-light placeholder:text-base"
                    />
                    <div className="text-sm text-[#8f7f74]">Title</div>
                    
                    <input
                        type="text"
                        id="title"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="border bg-white border-[#d7d0c7] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#b6ff4b] placeholder:font-light placeholder:text-base"
                    />

                    <div className="text-sm text-[#8f7f74]">Genre</div>
                    <input
                        type="text"
                        id="genre"
                        placeholder="Genre"
                        value={genre}
                        required
                        onChange={(e) => setGenre(e.target.value)}
                        className="border bg-white border-[#d7d0c7] p-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#b6ff4b] placeholder:font-light placeholder:text-base"
                    />

                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
                        <div className="pr-4">Any adult themes?</div>

                        <label htmlFor="adultThemesYes">Yes</label>
                        <input
                            type="checkbox"
                            id="adultThemesYes"
                            name="adultThemes"
                            checked={isAdultThemeSelected}
                            onChange={handleCheckboxChange}
                            className="accent-[#c3f680]"
                        />

                        <label htmlFor="adultThemesNo">No</label>
                        <input
                            type="checkbox"
                            id="adultThemesNo"
                            name="adultThemes"
                            checked={!isAdultThemeSelected}
                            onChange={(event) => setIsAdultThemeSelected(!event.target.checked)}
                            className="accent-[#c3f680]"
                        />
                    </div>
                    
                    
                    <label htmlFor="content" className="text-sm text-[#8f7f74]">
                        Write something to start the story off below...
                    </label>
                    <textarea
                        rows={5}
                        id="content"
                        placeholder="It was the best of times, it was the worst of times......"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        className="border w-full bg-white border-[#d7d0c7] p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b6ff4b] placeholder:font-light placeholder:text-base"
                    />
                    <div className="flex flex-col md:flex-row md:justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="px-5 py-2 rounded-full text-sm border border-[#d7d0c7] bg-white/70"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-full text-sm border border-[#b6ff4b] bg-[#f1ffd9] text-[#1b1a17] hover:bg-[#e4ffb8] transition"
                        >
                            Start Story
                        </button>
                    </div>
                </div>
                </form>
            </Modal>


            {/* Button that creates room */}
            <motion.div
                whileHover={{ x: 1 , y: 1}}
            >
                <button
                    className="border-black bg-[#fcfcfc]  border p-4  font-semibold rounded-lg py-3 px-7  text-black shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out"
                    onClick={handleOpenModal}>
                        Create New Story
                </button>
            </motion.div>
        </div>
    )
}

export default CreateRoom

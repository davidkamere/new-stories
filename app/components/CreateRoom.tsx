"use client"

import { useState } from "react";

import { createNewRoom } from "@/utils/db/actions";
import Modal from 'react-modal';
import { motion } from "framer-motion"
import { PlusIcon } from "@heroicons/react/20/solid";


const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        background: '#fcfcfc',
        border: '1px solid #d9d4ff',
        backdropFilter: 'blur(100px)' // Increase the blur value as desired
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

    const handleSubmit = (e: any) => {
        e.preventDefault()
        createNewRoom(title, content, genre)
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
                <form onSubmit={handleSubmit} className="text-base font-base px-6">
                <div className="flex flex-col space-y-8 mt-4 ">
                    <div>
                        Pick a title for the story and a genre: 
                    </div>
                    
                    <input
                        type="text"
                        id="title"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="border bg-[#f0f0f0] border-gray-300 p-2 rounded-md w-full  focus:outline-none focus:border-[#c3f680] placeholder:font-light placeholder:text-base "
                    />

                   
                    <input
                        type="text"
                        id="genre"
                        placeholder="Genre"
                        value={genre}
                        required
                        onChange={(e) => setGenre(e.target.value)}
                        className="border bg-[#f0f0f0] border-gray-300 p-2 rounded-md w-full  focus:outline-none focus:border-[#c3f680] placeholder:font-light placeholder:text-base "
                    />

                    <div className="flex flex-row space-x-4">
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
                    
                    
                    <label htmlFor="content" className="">
                        Write something to start the story off below...
                    </label>
                    <textarea
                        rows={5}
                        id="content"
                        placeholder="It was the best of times, it was the worst of times......"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        className="border w-full bg-[#f0f0f0] border-gray-300 p-2 rounded-md  focus:outline-none focus:border-[#c3f680]  placeholder:font-light placeholder:text-base"
                    />
                    <motion.div
                        whileHover={{ y: 1}}
                    >
                        <button
                            type="submit"
                            className=" p-4 border bg-[#fcfcfc] border-black text-semibold  font-semibold rounded-lg py-2 px-6 shadow-[1px_5px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out w-full"
                        >
                            Create New Story
                        </button>
                    </motion.div>
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
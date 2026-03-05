"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import CreateRoom from '@/app/components/CreateRoom'

import { supabase } from "@/utils/db/supabase";
import { getRooms } from "@/utils/db/actions"

import Story from "@/app/components/Story"
import { motion } from "framer-motion";
import Modal from "react-modal";

const modalStyles = {
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


const Rooms = () => {
    const [rooms, setRooms] = useState<any>([])
    const [payload, setPayload] = useState<any>(null)
    const router = useRouter()
    const [genreFilter, setGenreFilter] = useState<string>('All')
    const [isPenModalOpen, setIsPenModalOpen] = useState(false)
    const [penNameInput, setPenNameInput] = useState('')
    const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)



    useEffect(() => {
        getRoomsFromDb()
    }, [])

    const getRoomsFromDb = async () => {
        const dbRooms = await getRooms()
        setRooms(dbRooms)
    }


    useEffect(() => {
        const channel = supabase
          .channel('custom-all-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Status' },
            (payload) => {
                setPayload(payload.new)
            }
          )
          .subscribe();
    
        // Cleanup function to unsubscribe when the component unmounts
        return () => {
            channel.unsubscribe().catch((error) => {
                console.error('Error unsubscribing:', error);
            });
        };
    }, [])

    const openPenModal = (roomId: string) => {
        const saved = localStorage.getItem(`penname:${roomId}`) || ''
        if (saved) {
            router.push(`/room/${roomId}`)
            return
        }
        setPendingRoomId(roomId)
        setPenNameInput(saved)
        setIsPenModalOpen(true)
    }

    const closePenModal = () => {
        setIsPenModalOpen(false)
        setPendingRoomId(null)
    }

    const handleConfirmPenName = () => {
        if (!pendingRoomId) return
        const name = penNameInput.trim()
        if (!name) return
        localStorage.setItem(`penname:${pendingRoomId}`, name)
        setIsPenModalOpen(false)
        const target = pendingRoomId
        setPendingRoomId(null)
        router.push(`/room/${target}`)
    }

    return (
        <>
            <Modal
                isOpen={isPenModalOpen}
                onRequestClose={closePenModal}
                style={modalStyles}
                contentLabel="Choose pen name"
            >
                <div className="paper-bg rounded-md p-6 md:p-8 w-[90vw] max-w-[420px]">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#5f5f5a]">Pen Name</div>
                    <div className="ink-title text-2xl mt-2">Pick your story alias</div>
                    <p className="text-sm text-[#5f5f5a] mt-2">
                        This name stays with this story only. Keep it short and memorable.
                    </p>
                    <input
                        type="text"
                        placeholder="e.g. NightOwl"
                        value={penNameInput}
                        onChange={(e) => setPenNameInput(e.target.value)}
                        className="w-full mt-4 p-3 border border-[#c6c6c3] bg-[#f7f7f5] text-sm focus:outline-none focus:border-[#101010]"
                    />
                    <div className="flex flex-row justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={closePenModal}
                            className="px-4 py-2 text-sm border border-[#c6c6c3] bg-[#f7f7f5]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmPenName}
                            className="stamp px-5 py-2 text-sm border border-[#101010] bg-[#efefec] hover:bg-[#e4e4e0]"
                        >
                            Enter Story
                        </button>
                    </div>
                </div>
            </Modal>
            <div >
                {rooms?.length > 0  ?
                    <>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {(() => {
                            const uniqueGenres = new Set<string>()
                            rooms.forEach((r: any) => {
                                if (typeof r?.genre === 'string' && r.genre.trim()) {
                                    uniqueGenres.add(r.genre)
                                }
                            })

                            const genres: string[] = ['All', ...Array.from(uniqueGenres)]

                            return genres.map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGenreFilter(g)}
                                className={`text-[11px] px-3 py-1 border uppercase tracking-[0.12em] ${genreFilter === g ? 'border-[#101010] text-[#101010] bg-[#efefec]' : 'border-[#c6c6c3] text-[#5f5f5a] bg-[#f7f7f5]'}`}
                            >
                                {g}
                            </button>
                            ))
                        })()}
                    </div>
                    <div className="mt-6 space-y-6">
                        {
                            [...rooms]
                                .filter((room: any) => genreFilter === 'All' || room.genre === genreFilter)
                                .reverse()
                                .map((room: any, index) => (
                                
                                <motion.div
                                    key={index}
                                    initial={{ y: 40, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.08, type: "spring", stiffness: 120 }}
                                >                         
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            openPenModal(room.room_id)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                openPenModal(room.room_id)
                                            }
                                        }}
                                        className="paper-bg lift-card grid justify-items-start spacing-2 p-5 md:p-7 rounded-md text-base md:text-lg hover:cursor-pointer"
                                        key={room.room_id}
                                    >        
                                        <Story 
                                            title={room.story_title}
                                            content={room.story_content}
                                            created_at={room.created_at}
                                            genre={room.genre}
                                            room_id={room.room_id}
                                            payload={payload}
                                        />
                                    </div>
                                </motion.div> 
                                
                                )
                            )
                        }
                    </div>
                    <div className='mt-16 mb-20 text-[#101010] flex justify-center'>
                        <CreateRoom getRoomsFromDb={getRoomsFromDb} />
                    </div>
                    
                    </> :
                    <div className="min-h-screen flex justify-center items-center animate-spin">
                        ...
                    </div>
                }
            </div>
        </>
    )
}

export default Rooms;

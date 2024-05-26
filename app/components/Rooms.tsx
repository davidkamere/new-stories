"use client"

import { useState, useEffect } from "react";
import Link from "next/link";

import CreateRoom from '@/app/components/CreateRoom'

import { supabase } from "@/utils/db/supabase";
import { getRooms } from "@/utils/db/actions"

import Story from "@/app/components/Story"
import { motion } from "framer-motion";
import { setUpSocket } from "@/utils/socket"


const Rooms = () => {
    const [rooms, setRooms] = useState<any>([])
    const [payload, setPayload] = useState<any>(null)


    const socket = setUpSocket()

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

    console.log(socket)
    return (
        <>
            <div >
                {rooms?.length > 0  ?
                    <>
                   
                    <div className="mt-12 space-y-5 mx-5 md:mx-24 ">
                        {
                            [...rooms].reverse().map((room: any, index) => (
                                
                                <motion.div
                                    key={index}
                                    initial={{ y: "100vh" }}
                                    animate={{ y: 0 }}
                                    transition={{ delay: index * 0.2, type: "spring", stiffness: 100 }}
                                >                         
                                    <Link href={`/room/${room.room_id}`} className="grid justify-items-start spacing-2 border border-[#f9f8f6] hover:transition hover:ease-in hover:border hover:border-[#c3f680] bg-[#f0f0f0] p-7 rounded-xl text-lg hover:cursor-pointer" key={room.room_id}>        
                                        <Story 
                                            title={room.story_title}
                                            content={room.story_content}
                                            created_at={room.created_at}
                                            genre={room.genre}
                                            room_id={room.room_id}
                                            payload={payload}
                                        />
                                    </Link>
                                </motion.div> 
                                
                                )
                            )
                        }
                    </div>
                    <div className='mt-20 mb-20 text-[#261201] flex justify-center'>
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
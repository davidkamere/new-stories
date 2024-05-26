"use client"

import { useState, useEffect } from "react"
import { FlagIcon } from "@heroicons/react/20/solid"
import { motion } from 'framer-motion';
import { getStatus } from "@/utils/db/actions";

type StoryProps = {
    title : string,
    content? : string,
    created_at : string,
    genre? : string,
    room_id? : string,
    payload? : any
}


const Story = ( {title, content, created_at, genre, room_id, payload} : StoryProps ) => {

    const [complete, setComplete] = useState<Boolean>(false)
    const [status, setStatus] = useState<any>(null)

    const getStatusFromDb = async () => {
        const dbStatus = await getStatus(room_id as string)
        dbStatus && setStatus(dbStatus[0])
    }

    useEffect(() => {
        getStatusFromDb()
    }, [])

    useEffect(() => {
        if (payload && payload?.room_id === room_id) {
            if (payload?.status === 'Complete') {
                setComplete(true)
            } else {
                setComplete(false)
            }
        }
    }, [payload])

    useEffect(() => {
        if (status && status?.status === 'Complete') {
            setComplete(true)
        } else {
            setComplete(false)
        }
    }, [status])

   


    // Convert to UK time
    const timestampString = created_at
    const timestamp = new Date(timestampString);
    const ukOptions = {
        timeZone: 'Europe/London',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }
    const ukFormattedDate = timestamp.toLocaleString('en-GB', ukOptions as any)

    
    return (
        <div className="w-full">
            <div className="grid grid-cols-2 mt-2">
                <div className="text-2xl text-[#261201] font-bold">
                    {title}
                </div> 
            </div>

            <div className="text-sm mt-2 text-[#866e6e]">{ukFormattedDate}</div>
            <div className="mt-6 text-base font-normal max-w-fit whitespace-normal">{content?.slice(0, 300)}...</div>

            <div className="flex flex-row justify-between items-center mt-6 "> 

                { status && complete ?
                    <div className={`text-sm font-semibold flex flex-row text-[#ffa06c]`}>
                        Completed <FlagIcon className="pl-2 h-6 w-6" /> 
                    </div> :
                    
                    <motion.div
                        className={`text-sm font-semibold flex flex-row text-[#a6cf49]`}
                        animate={{ scale: [1, 1.03, 1.02] }} 
                        transition={{ duration: 2, repeat: 1, ease: "easeInOut" }}
                    >
                        In Progress <FlagIcon className="pl-2 h-6 w-6" /> 
                    </motion.div>
                }
                
                <button className="text-center text-sm text-[#866e6e] font-bold">
                        # {genre}
                </button>
                                        
            </div>
        </div>
    )
}

export default Story
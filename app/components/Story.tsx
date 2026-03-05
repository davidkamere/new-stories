"use client"

import { useState, useEffect, useCallback } from "react"
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
    const [typing, setTyping] = useState<Boolean>(false)
    const [recentlyActive, setRecentlyActive] = useState<Boolean>(false)
    const [status, setStatus] = useState<any>(null)

    const getStatusFromDb = useCallback(async () => {
        if (!room_id) return
        const dbStatus = await getStatus(room_id as string)
        dbStatus && setStatus(dbStatus[0])
    }, [room_id])

    useEffect(() => {
        getStatusFromDb()
    }, [getStatusFromDb])

    useEffect(() => {
        if (payload && payload?.room_id === room_id) {
            if (payload?.status === 'Complete') {
                setComplete(true)
            } else {
                setComplete(false)
            }
            const statusValue = payload?.status || ''
            if (statusValue.startsWith('Typing:')) {
                const ts = statusValue.replace('Typing:', '').trim()
                const typingAt = new Date(ts).getTime()
                setTyping(Date.now() - typingAt < 2 * 60 * 1000)
            } else {
                setTyping(false)
            }
            if (statusValue.startsWith('Active:')) {
                const ts = statusValue.replace('Active:', '').trim()
                const activeAt = new Date(ts).getTime()
                setRecentlyActive(Date.now() - activeAt < 30 * 60 * 1000)
            }
        }
    }, [payload, room_id])

    useEffect(() => {
        if (status && status?.status === 'Complete') {
            setComplete(true)
        } else {
            setComplete(false)
        }
        const statusValue = status?.status || ''
        if (statusValue.startsWith('Typing:')) {
            const ts = statusValue.replace('Typing:', '').trim()
            const typingAt = new Date(ts).getTime()
            setTyping(Date.now() - typingAt < 2 * 60 * 1000)
        } else {
            setTyping(false)
        }
        if (statusValue.startsWith('Active:')) {
            const ts = statusValue.replace('Active:', '').trim()
            const activeAt = new Date(ts).getTime()
            setRecentlyActive(Date.now() - activeAt < 30 * 60 * 1000)
        } else {
            setRecentlyActive(false)
        }
    }, [status])

    const getContributors = () => {
        if (!content) return []
        const regex = /\[pen:([^|\]]+)(?:\|mode:(continue|paragraph))?\]/g
        const contributors = new Set<string>()
        let match: RegExpExecArray | null
        while ((match = regex.exec(content)) !== null) {
            contributors.add(match[1].trim())
        }
        return Array.from(contributors)
    }

    const contributors = getContributors()
    const isFull = contributors.length >= 12
    const genreHue = (() => {
        const g = (genre || 'story').toString()
        let hash = 0
        for (let i = 0; i < g.length; i++) hash = (hash * 31 + g.charCodeAt(i)) | 0
        return Math.abs(hash) % 360
    })()

   


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
        <div className="w-full group">
            {recentlyActive && (
                <div className="ribbon inline-flex items-center text-[10px] px-2 py-1 mb-4 uppercase tracking-[0.14em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2f7a43] type-dot mr-2"></span>
                    Recently active
                </div>
            )}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <div className="text-xl md:text-3xl ink-title text-[#101010] leading-tight">
                        {title}
                    </div>
                    <div className="text-[10px] md:text-[11px] mt-2 text-[#5f5f5a] uppercase tracking-[0.2em]">
                        {ukFormattedDate}
                    </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                    <span className="text-[11px] px-3 py-1 genre-chip uppercase tracking-[0.12em]" style={{ ["--genre-hue" as any]: genreHue }}>
                        #{genre}
                    </span>
                    {isFull && (
                        <span className="text-[11px] px-3 py-1 border border-[#d16a1c] text-[#d16a1c] uppercase tracking-[0.12em]">
                            Full
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-4 md:mt-5 text-sm md:text-base text-[#262623] max-h-20 overflow-hidden group-hover:max-h-96 transition-all leading-7">
                {content?.slice(0, 500)}
            </div>

            <div className="flex items-center mt-5 md:mt-6 text-xs md:text-sm text-[#101010] flex-wrap gap-2">
                <span className="px-3 py-1 border border-[#c6c6c3] bg-[#f7f7f5]">
                    Contributors: {contributors.length}/12
                </span>
                {typing && (
                    <span className="ml-3 inline-flex items-center text-[#2f7a43] uppercase tracking-[0.12em] text-[11px]">
                        <span className="h-2 w-2 rounded-full bg-[#2f7a43] type-dot"></span>
                        <span className="ml-2">Typing</span>
                    </span>
                )}
            </div>
        </div>
    )
}

export default Story

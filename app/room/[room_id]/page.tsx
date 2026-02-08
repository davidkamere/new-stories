'use client'

import { useEffect, useRef, useState, useCallback } from "react"

import StoryEditor from "@/app/components/StoryEditor"
import Header from "@/app/components/Header"


import { setUpSocket } from "@/utils/socket"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabaseClient } from "@/utils/db/supabase"
import { getStory, upsertStatus, createNewRoom } from "@/utils/db/actions"

import { motion } from "framer-motion"


import Modal from 'react-modal';



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
        // width: '50%',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        background: '#fcfcfc',
        border: '1px solid #dcdddf',
        borderRadius: '10px',
        backdropFilter: 'blur(100px)',
        zIndex: 61,
    },
};

export default function Page({ params }: { params: { room_id: string } }) {
    
    const [story, setStory] = useState<any>([])
    const [editable, setEditable] = useState<boolean>(false)
    const [lockState, setLockState] = useState<'open' | 'self' | 'other'>('open')
    const [currentlyEditing, setCurrentlyEditing] = useState<boolean>(false)
    const [clearContent, setClearContent] = useState<boolean>(false)

    const [content, setContent] = useState<string>('')
    const [lockCountdown, setLockCountdown] = useState<number>(0)
    const contentRef = useRef<string>('')
    const [penName, setPenName] = useState<string>('')
    const [hoverAuthor, setHoverAuthor] = useState<string | null>(null)
    const [startMode, setStartMode] = useState<'continue' | 'paragraph'>('continue')
    const [highlightOwn, setHighlightOwn] = useState<boolean>(true)
    const [readingMode, setReadingMode] = useState<boolean>(false)
    const [forking, setForking] = useState<boolean>(false)
    const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const LOCK_TIMEOUT_MS = 60000

    const [isOpen, setIsOpen] = useState(false)
    const [saveError, setSaveError] = useState<string>('')
    const [isForkOpen, setIsForkOpen] = useState(false)
    const [forkName, setForkName] = useState<string>('')
    const [isPenOpen, setIsPenOpen] = useState(false)
    const [penDraft, setPenDraft] = useState<string>('')

    const handleOpenModal = () => {
        setIsOpen(true );
    }

    const closeModal = () => {
        setIsOpen(false);
    }
    const closeForkModal = () => {
        setIsForkOpen(false)
        setForkName('')
    }
    const closePenModal = () => {
        setIsPenOpen(false)
        setPenDraft('')
    }

    const room_id = params.room_id
    const socketRef = useRef<any>(null)
    const router = useRouter()

    const supabase = supabaseClient

    const specialChannelName = 'roomInfo: ' + room_id;
    const saveEditsChannel = 'saveEdits: ' + room_id;

    

    // socket.on(specialChannelName, (data: any) => {
    //     if(data["activeUser"] && user){
    //         if(data["activeUser"] !== user.data.session.user.email){
    //             setEditable(false)
    //         } else {
    //             setEditable(true)
    //             setCurrentlyEditing(true)
    //         }
    //     } else {

    //         // return to default state
    //         setEditable(true)
    //         setCurrentlyEditing(false)
    //     }

    //     if (data["typedContent"]) {setContent(data["typedContent"])}
    // })

    // socket.on(saveEditsChannel, (data: any) => {
    //     getStoryfromDB()
    // })

    const getStoryfromDB = useCallback(async () => {
        const Story = await getStory(room_id)
        if (Story) { setStory(Story[0]) }
    }, [room_id])

    useEffect(() => {
        getStoryfromDB()
    }, [getStoryfromDB])

    const colorForAuthor = (name: string) => {
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = (hash * 31 + name.charCodeAt(i)) | 0
        }
        const hue = Math.abs(hash) % 360
        return {
            base: `hsl(${hue}, 70%, 45%)`,
            bg: `hsla(${hue}, 85%, 75%, 0.35)`
        }
    }

    const parseStoryContent = (raw: string) => {
        if (!raw) return []
        const cleaned = raw.replace(/\[forked-from:[^\]]+\]/g, '')
        const parsed: Array<{ author: string; text: string; mode: 'continue' | 'paragraph'; at?: string }> = []
        const regex = /\[pen:([^|\]]+)(?:\|mode:(continue|paragraph))?(?:\|at:([^\]]+))?\]/g
        let match: RegExpExecArray | null
        let lastIndex = 0
        let lastAuthor = 'Unknown'
        let lastMode: 'continue' | 'paragraph' = 'continue'
        let lastAt: string | undefined = undefined

        while ((match = regex.exec(cleaned)) !== null) {
            const before = cleaned.slice(lastIndex, match.index).replace(/^\s+|\s+$/g, '')
            if (before) {
                parsed.push({ author: lastAuthor, text: before, mode: lastMode, at: lastAt })
            }
            lastAuthor = match[1].trim()
            lastMode = (match[2] as 'continue' | 'paragraph' | undefined) || 'continue'
            lastAt = match[3]
            lastIndex = regex.lastIndex
        }

        const tail = cleaned.slice(lastIndex).replace(/^\s+|\s+$/g, '')
        if (tail) {
            parsed.push({ author: lastAuthor, text: tail, mode: lastMode, at: lastAt })
        }

        return parsed
    }

    const getRoomStatus = () => {
        const segments = parseStoryContent(story.story_content || '')
        const uniqueAuthors = Array.from(new Set(segments.map((s) => s.author)))
        const contributor = !!penName && uniqueAuthors.includes(penName)
        const full = uniqueAuthors.length >= 12
        return { segments, uniqueAuthors, isContributor: contributor, isRoomFull: full }
    }


    useEffect(() => {
        if (socketRef.current) return
        const socket = setUpSocket(room_id)
        socketRef.current = socket

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data)
                if (data?.type === "lock") {
                    const activeUser = data?.activeUser
                    if (!activeUser) {
                        setLockState('open')
                        setEditable(false)
                        setCurrentlyEditing(false)
                        return
                    }
                    if (activeUser === penName) {
                        setLockState('self')
                        setEditable(true)
                    } else {
                        setLockState('other')
                        setEditable(false)
                        setCurrentlyEditing(false)
                        setContent('')
                        setClearContent(true)
                    }
                }
            } catch {
                // ignore non-json messages
            }
        }

        socket.addEventListener("message", handleMessage)

        return () => {
            socket.removeEventListener("message", handleMessage)
            socket.close()
            socketRef.current = null
        }
    }, [room_id, penName])

    useEffect(() => {
        if (!room_id) return
        const saved = localStorage.getItem(`penname:${room_id}`)
        if (saved) {
            setPenName(saved)
        }
    }, [room_id])

    useEffect(() => {
        if (!room_id) return
        const channel = supabase
            .channel(`room-updates-${room_id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'Rooms', filter: `room_id=eq.${room_id}` },
                (payload) => {
                    if (payload?.new) {
                        setStory((prev: any) => ({ ...prev, ...payload.new }))
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe().catch(() => {})
        }
    }, [room_id, supabase])

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null

        // If user has the lock but hasn't typed anything, start a timeout to release it.
        if (lockState === 'self' && content.trim().length === 0) {
            if (!lockTimeoutRef.current) {
                lockCountdown === 0 && setLockCountdown(LOCK_TIMEOUT_MS / 1000)
                lockTimeoutRef.current = setTimeout(() => {
                    // Re-check conditions before releasing
                        if (lockState === 'self' && contentRef.current.trim().length === 0) {
                            socketRef.current?.send(JSON.stringify({
                                type: "stop_editing",
                                user: penName,
                            }))
                            upsertStatus(room_id, 'Idle')
                        }
                    lockTimeoutRef.current = null
                    setLockCountdown(0)
                }, LOCK_TIMEOUT_MS)
            }

            intervalId = setInterval(() => {
                setLockCountdown((prev) => (prev > 0 ? prev - 1 : 0))
            }, 1000)
        }

        // Clear timeout once user types or loses lock
        if (lockState !== 'self' || content.trim().length > 0) {
            if (lockTimeoutRef.current) {
                clearTimeout(lockTimeoutRef.current)
                lockTimeoutRef.current = null
            }
            if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
            }
            if (lockCountdown !== 0) {
                setLockCountdown(0)
            }
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [lockState, content, penName, lockCountdown, room_id])


    const saveContributionToDB = async (content: string) => {
        const { data, error } = await supabase
            .from('Rooms')
            .update({ story_content: content })
            .eq('room_id', room_id)
        if (error) {
            console.error('Error saving data:', error.message)
            return { data: null, error }
        }
        return { data, error: null }
    }

    // open up the room for others to edit
    const saveEdits = async () => {
        const draft = contentRef.current.trim()
        if (!draft) {
            closeModal()
            return
        }
        const { isRoomFull, isContributor } = getRoomStatus()
        if (isRoomFull && !isContributor) {
            setSaveError('This story already has 12 contributors. You can read, but new contributors cannot add.')
            closeModal()
            return
        }
        console.log('Saving draft length:', draft.length)
        const header = `[pen:${penName || 'Anonymous'}|mode:${startMode}|at:${new Date().toISOString()}]`
        const normalizedDraft = draft.replace(/\s*\n\s*/g, ' ').trim()
        if (startMode === 'continue') {
            // Append inline to the existing paragraph
            const updatedContent = `${story.story_content.trimEnd()} ${header} ${normalizedDraft}`
            const result = await saveContributionToDB(updatedContent)
            if (result?.error) {
                setSaveError(result.error.message)
                return
            }
            console.log('Save successful')
            setSaveError('')
            setStory((prev: any) => ({ ...prev, story_content: updatedContent }))
        } else {
            const updatedContent = `${story.story_content.trimEnd()}\n\n${header}\n${normalizedDraft}`
            const result = await saveContributionToDB(updatedContent)
            if (result?.error) {
                setSaveError(result.error.message)
                return
            }
            console.log('Save successful')
            setSaveError('')
            setStory((prev: any) => ({ ...prev, story_content: updatedContent }))
        }
        setClearContent(true)
        socketRef.current?.send(JSON.stringify({
            type: "stop_editing",
            user: penName,
        }))
        upsertStatus(room_id, `Active:${new Date().toISOString()}`)
        
        closeModal()
        // socket.emit('saveEdits', {room_id: room_id})
    }

    const deleteEdits = () => {
        setClearContent(true)
        setContent('')
        contentRef.current = ''
        socketRef.current?.send(JSON.stringify({
            type: "stop_editing",
            user: penName,
        }))
        upsertStatus(room_id, 'Idle')
        setSaveError('')
        closeModal()
    }

    console.log("Editable: ", editable), console.log("Currently Editing: ", currentlyEditing)
    

    return (
        <div>
            
            <Header/>
            <Modal isOpen={isOpen} onRequestClose={closeModal} style={customStyles} >
                <div className="paper-bg rounded-3xl p-6 md:p-8 w-[90vw] max-w-[520px]">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#6acb25]">Confirm</div>
                    <div className="ink-title text-2xl mt-2 text-[#1b1a17]">Add this to the story?</div>
                    <p className="text-sm text-[#8f7f74] mt-2">
                        Once submitted, this piece can’t be edited — but others can build on it.
                    </p>

                    {saveError && (
                        <div className="mt-4 text-sm text-red-600">
                            {saveError}
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:justify-between gap-3 mt-6">
                        <button
                            type="button"
                            className="px-5 py-2 rounded-full text-sm border border-[#d7d0c7] bg-white/70"
                            onClick={deleteEdits}
                        >
                            Clear Draft
                        </button>
                        <button
                            type="button"
                            className="stamp px-5 py-2 rounded-full text-sm border border-black bg-[#b6ff4b]"
                            onClick={saveEdits}
                        >
                            Add to Story
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isForkOpen} onRequestClose={closeForkModal} style={customStyles}>
                <div className="paper-bg rounded-3xl p-6 md:p-8 w-[90vw] max-w-[520px]">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#8f7f74]">Fork Story</div>
                    <div className="ink-title text-2xl mt-2">Name your fork</div>
                    <p className="text-sm text-[#8f7f74] mt-2">
                        This creates a new story starting from the current one.
                    </p>
                    <input
                        type="text"
                        placeholder={`${story.story_title} (Fork)`}
                        value={forkName}
                        onChange={(e) => setForkName(e.target.value)}
                        className="w-full mt-4 p-3 rounded-xl border border-[#d7d0c7] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#b6ff4b]"
                    />
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={closeForkModal}
                            className="px-4 py-2 rounded-full text-sm border border-[#d7d0c7]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="stamp px-5 py-2 rounded-full text-sm border border-black bg-[#b6ff4b]"
                            onClick={async () => {
                                setForking(true)
                                try {
                                    const forkTitle = (forkName || `${story.story_title} (Fork)`).trim()
                                    const forkContent = `${story.story_content || ''}\n\n[forked-from:${story.story_title}]`
                                    const created = await createNewRoom(forkTitle, story.story_content || '', story.genre || '')
                                    if (!created?.[0]?.room_id) return
                                    await supabase
                                        .from('Rooms')
                                        .update({ story_content: forkContent })
                                        .eq('room_id', created[0].room_id)
                                    const newRoomId = created?.[0]?.room_id
                                    if (newRoomId) {
                                        if (penName) localStorage.setItem(`penname:${newRoomId}`, penName)
                                        router.push(`/room/${newRoomId}`)
                                    }
                                } finally {
                                    setForking(false)
                                    closeForkModal()
                                }
                            }}
                        >
                            Create Fork
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isPenOpen} onRequestClose={closePenModal} style={customStyles}>
                <div className="paper-bg rounded-3xl p-6 md:p-8 w-[90vw] max-w-[520px]">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#8f7f74]">Pen Name</div>
                    <div className="ink-title text-2xl mt-2">Update your pen name</div>
                    <p className="text-sm text-[#8f7f74] mt-2">
                        This only changes your name for this story.
                    </p>
                    <input
                        type="text"
                        placeholder="Pen name"
                        value={penDraft}
                        onChange={(e) => setPenDraft(e.target.value)}
                        className="w-full mt-4 p-3 rounded-xl border border-[#d7d0c7] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#b6ff4b]"
                    />
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={closePenModal}
                            className="px-4 py-2 rounded-full text-sm border border-[#d7d0c7]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="stamp px-5 py-2 rounded-full text-sm border border-black bg-[#b6ff4b]"
                            onClick={() => {
                                const name = penDraft.trim()
                                if (!name) return
                                localStorage.setItem(`penname:${room_id}`, name)
                                setPenName(name)
                                closePenModal()
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
            {story.story_content ?
            <div className="min-h-screen flex flex-col px-6 py-2 mb-20">
                <div className="mt-6 px-2 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-2 md:space-x-3 flex-wrap gap-2">
                        <Link href="/" className="text-xs px-2 py-1 rounded-full">←</Link>
                        <span className="text-[10px] md:text-xs px-3 py-1 rounded-full" style={{ ["--genre-hue" as any]: (story?.genre || 'story').length * 9, color: 'var(--muted)' }}>
                            #{story.genre}
                        </span>
                        {penName && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPenDraft(penName)
                                    setIsPenOpen(true)
                                }}
                                className="text-[10px] md:text-xs text-[#8f7f74] underline decoration-dotted underline-offset-4 hover:text-[#1b1a17] hover:decoration-[#b6ff4b] hover:drop-shadow-[0_0_6px_rgba(182,255,75,0.6)] transition"
                            >
                                Pen name: {penName}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setReadingMode((prev) => !prev)}
                            className={`text-[10px] md:text-xs px-3 md:px-4 py-2 rounded-full ${readingMode ? 'bg-[#1b1a17] text-white neon-ring' : 'border border-[#d7d0c7] bg-white/60'}`}
                        >
                            {readingMode ? 'Exit Reading Mode' : 'Reading Mode'}
                        </button>
                        <button
                            type="button"
                            disabled={forking}
                            onClick={async () => {
                                if (forking) return
                                setForkName('')
                                setIsForkOpen(true)
                            }}
                            className="text-[10px] md:text-xs px-3 py-2 rounded-full border border-[#b6ff4b] text-[#1b1a17] bg-[#eaffc5]"
                        >
                            {forking ? 'Forking…' : 'Fork Story'}
                        </button>
                    </div>
                </div>
                <div className="mt-4 ink-title text-3xl md:text-5xl px-2">
                    {story.story_title}
                </div>
                {(() => {
                    const match = story.story_content?.match(/\[forked-from:([^\]]+)\]/)
                    if (!match) return null
                    return (
                        <div className="px-2 mt-2 text-sm text-[#8f7f74]">
                            Forked from: {match[1].trim()}
                        </div>
                    )
                })()}
                {!readingMode && (
                    <div className="px-2 mt-3">
                        {lockState === 'self' && (
                            <div className="inline-flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-[#6acb25] type-dot"></span>
                                <span className="text-sm text-[#8f7f74]">Your turn</span>
                            </div>
                        )}
                        {lockState === 'open' && (
                            <div className="text-sm text-[#8f7f74] opacity-80">
                                Story is open — claim the turn when ready.
                            </div>
                        )}
                        {lockState === 'other' && (
                            <div className="text-sm text-[#ff8a5c] bg-[#fff2eb] border border-[#ffd9c9] rounded-full px-4 py-1 inline-block">
                                Someone else is writing right now.
                            </div>
                        )}
                    </div>
                )}
                <div className="mt-6">
                    <aside className="rounded-2xl p-2 mb-6">
                        <details>
                            <summary className="cursor-pointer text-xs uppercase tracking-[0.3em] text-[#8f7f74]">
                                Contributors ({getRoomStatus().uniqueAuthors.length})
                            </summary>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {getRoomStatus().uniqueAuthors.map((name) => {
                                    const color = colorForAuthor(name)
                                    return (
                                        <div key={name} className="flex items-center space-x-2 text-sm">
                                            <span className="h-1.5 w-3 rounded-full" style={{ background: color.base }}></span>
                                            <span className="truncate max-w-[120px]">{name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </details>
                    </aside>
                    <div className={readingMode ? "leading-8 md:leading-9 text-lg md:text-xl" : "leading-7 md:leading-8 text-base md:text-lg"}>
                        <div className='mt-2 p-2 leading-8 text-normal '>
                    {(() => {
                        const { segments, uniqueAuthors, isContributor, isRoomFull } = getRoomStatus()
                        return (
                            <>
                                {isRoomFull && !isContributor && (
                                    <div className="text-sm text-[#866e6e] mb-4">
                                        This story already has 12 contributors. You can read, but new contributors can’t add.
                                    </div>
                                )}
                                {(() => {
                                    const paragraphs: Array<Array<any>> = []
                                    let current: Array<any> = []
                                    segments.forEach((seg: any) => {
                                        if (seg.mode === 'paragraph') {
                                            if (current.length > 0) paragraphs.push(current)
                                            current = [seg]
                                        } else {
                                            if (current.length === 0) current = [seg]
                                            else current.push(seg)
                                        }
                                    })
                                    if (current.length > 0) paragraphs.push(current)

                                    return paragraphs.map((para, pIdx) => (
                                        <p key={`p-${pIdx}`} className="mb-6 leading-7">
                                            {para.map((seg: any, sIdx: number) => {
                                                const color = colorForAuthor(seg.author)
                                                const isHighlighted = hoverAuthor === seg.author || (highlightOwn && penName && seg.author === penName)
                                                return (
                                                    <span
                                                        key={`${seg.author}-${pIdx}-${sIdx}`}
                                                        onMouseEnter={() => setHoverAuthor(seg.author)}
                                                        onMouseLeave={() => setHoverAuthor(null)}
                                                        className="group relative whitespace-pre-wrap py-0.5 rounded"
                                                        style={{ background: isHighlighted ? color.bg : 'transparent' }}
                                                        title={seg.author}
                                                    >
                                                        {sIdx > 0 ? ' ' : ''}
                                                        {seg.text}
                                                        <span className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-90 transition-opacity pointer-events-none">
                                                            {seg.author}
                                                        </span>
                                                    </span>
                                                )
                                            })}
                                        </p>
                                    ))
                                })()}
                            </>
                        )
                    })()}
                        </div>
                    </div>
                </div>
                {/*
                <div className="px-2 mt-4">
                    <details>
                        <summary className="cursor-pointer text-xs uppercase tracking-[0.3em] text-[#8f7f74]">
                            Recent Contributions
                        </summary>
                        <div className="mt-3 space-y-2 text-sm text-[#8f7f74]">
                            {getRoomStatus().segments.slice(-5).reverse().map((seg, idx) => (
                                <div key={`${seg.author}-${idx}`} className="flex items-center justify-between">
                                    <span className="truncate max-w-[70%]">{seg.author}</span>
                                    <span className="text-xs">
                                        {seg.at ? new Date(seg.at).toLocaleString() : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
                */}
                {!readingMode && (
                <div className="mt-8 mb-4 px-2 relative">
                    {lockState === 'self' && content.trim().length > 0 && (
                        <div className="mb-3 flex items-center space-x-3">
                            <div className="text-sm text-[#ff8a5c] bg-[#fff2eb] border border-[#ffd9c9] rounded-full px-4 py-1 inline-block">
                                You are the only one writing right now.
                            </div>
                            <label className="flex items-center space-x-2 cursor-pointer text-xs text-[#8f7f74]">
                                <input
                                    type="checkbox"
                                    checked={highlightOwn}
                                    onChange={(e) => setHighlightOwn(e.target.checked)}
                                    className="accent-[#b6ff4b]"
                                />
                                <span>Highlight my contributions</span>
                            </label>
                        </div>
                    )}
                    {(() => {
                        const { isContributor, isRoomFull } = getRoomStatus()
                        if (isRoomFull && !isContributor) {
                            return (
                                <div className="cinematic-lock rounded-2xl border border-[#2b2926] flex items-center justify-center text-sm min-h-40 w-full">
                                    Read-only: this story is full.
                                </div>
                            )
                        }
                        return (
                            !penName ? (
                                <div className="rounded-lg bg-white/70 border border-[#FEE2E2] flex items-center justify-center text-sm text-[#866e6e] min-h-40 w-full">
                                    Choose a pen name from the main page to write.
                                </div>
                            ) : lockState === 'self' ? (
                                <StoryEditor
                                    story={story}
                                    setCurrentlyEditing={setCurrentlyEditing}
                                    clearContent={clearContent}
                                    setClearContent={setClearContent}
                                    editable={editable}
                                    onStartEditing={() => {
                                        socketRef.current?.send(JSON.stringify({
                                            type: "start_editing",
                                            user: penName,
                                        }))
                                upsertStatus(room_id, `Typing:${new Date().toISOString()}`)
                                    }}
                                    onContentChange={(text) => {
                                        contentRef.current = text
                                        setContent(text)
                                    }}
                                />
                            ) : lockState === 'open' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const name = penName.trim()
                                        if (!name) return
                                        socketRef.current?.send(JSON.stringify({
                                            type: "start_editing",
                                            user: name,
                                        }))
                                upsertStatus(room_id, `Typing:${new Date().toISOString()}`)
                                    }}
                                    className="paper-bg rounded-2xl border border-[#c3f680] flex items-center justify-center text-sm text-[#8f7f74] min-h-40 w-full hover:bg-white"
                                >
                                    Tap to start writing
                                </button>
                            ) : (
                                <div className="cinematic-lock rounded-2xl border border-[#2b2926] flex items-center justify-center text-sm min-h-40">
                                    <div className="flex flex-col items-center space-y-3">
                                        <span className="text-base">Waiting on the writer…</span>
                                        <span className="flex items-center space-x-2">
                                            <span className="h-2 w-2 rounded-full bg-[#b6ff4b] animate-bounce [animation-delay:-0.2s]"></span>
                                            <span className="h-2 w-2 rounded-full bg-[#b6ff4b] animate-bounce"></span>
                                            <span className="h-2 w-2 rounded-full bg-[#b6ff4b] animate-bounce [animation-delay:0.2s]"></span>
                                        </span>
                                    </div>
                                </div>
                            )
                        )
                    })()}
                </div>
                )}
                {!readingMode && lockState === 'self' && content.trim().length === 0 && lockCountdown > 0 && (
                    <div className="text-[#8f7f74] flex text-sm justify-center px-2 transform transition ease-in">
                        Start typing within{" "}
                        <span className="text-[#1b1a17] font-semibold px-1">
                            {lockCountdown}s
                        </span>{" "}
                        to keep the turn.
                    </div>
                )}
                {!readingMode && lockState === 'self' && (
                    <div className="flex flex-col items-center justify-center text-sm text-[#8f7f74] px-2 mt-3 space-y-4">
                        <div className="text-center text-xs uppercase tracking-[0.25em] text-[#8f7f74]">
                            Start mode
                        </div>
                        <div className="text-center text-sm text-[#8f7f74]">
                            <span className="font-semibold text-[#1b1a17]">Continue</span> keeps you in the same paragraph.{" "}
                            <span className="font-semibold text-[#1b1a17]">New paragraph</span> starts a fresh line.
                        </div>
                        <div className="flex items-center justify-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setStartMode('continue')}
                                className={`px-4 py-2 rounded-full border flex items-center space-x-2 ${startMode === 'continue' ? 'border-black text-[#1b1a17] bg-white/70 neon-ring' : 'border-[#c3f680] text-[#8f7f74] bg-white/40'} `}
                            >
                                <span className="text-xs px-2 py-0.5 rounded-full border border-[#d7d0c7]">↩︎</span>
                                <span>Continue</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStartMode('paragraph')}
                                className={`px-4 py-2 rounded-full border flex items-center space-x-2 ${startMode === 'paragraph' ? 'border-black text-[#1b1a17] bg-white/70 neon-ring' : 'border-[#c3f680] text-[#8f7f74] bg-white/40'} `}
                            >
                                <span className="text-xs px-2 py-0.5 rounded-full border border-[#d7d0c7]">¶</span>
                                <span>New paragraph</span>
                            </button>
                            {lockCountdown > 0 && (
                                <div
                                    className="h-10 w-10 rounded-full neon-ring flex items-center justify-center text-[10px] text-[#1b1a17]"
                                    style={{
                                        background: `conic-gradient(var(--neon) ${Math.round((lockCountdown / (LOCK_TIMEOUT_MS / 1000)) * 360)}deg, rgba(0,0,0,0.08) 0deg)`
                                    }}
                                >
                                    {lockCountdown}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {!readingMode && lockState === 'other' && (
                    <div className="text-[#866e6e] flex text-sm  justify-center px-4 transform transition ease-in">
                        Another user is currently writing. You can start once they submit.
                    </div>
                )}
                
                {!readingMode && lockState === 'self' && content.trim().length > 0 &&
                        <>
                            <div className="w-full flex justify-center px-2 font-bold mt-6">
                                <motion.div whileHover={{ x: 1 , y: 1}}>
                                    <button onClick={() => setIsOpen(true)} className="stamp px-8 py-4 bg-[#b6ff4b] border-black flex flex-row border rounded-2xl shadow-[2px_6px_1px_0_black] hover:shadow-none transform transition duration-300 ease-in-out">
                                        <p className="pr-2 uppercase tracking-[0.2em] text-sm"> Add to Story </p>
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

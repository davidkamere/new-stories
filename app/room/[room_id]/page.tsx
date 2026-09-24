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



const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(45, 43, 40, 0.4)',
    backdropFilter: 'blur(4px)',
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
    const [currentParagraphIdx, setCurrentParagraphIdx] = useState<number>(0)
    const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([])
    const [forking, setForking] = useState<boolean>(false)
    const [saving, setSaving] = useState<boolean>(false)
    const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const LOCK_TIMEOUT_MS = 60000

    const [isOpen, setIsOpen] = useState(false)
    const [saveError, setSaveError] = useState<string>('')
    const [forkError, setForkError] = useState<string>('')
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
        setForkError('')
    }
    const closePenModal = () => {
        setIsPenOpen(false)
        setPenDraft('')
    }

  const handleForkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (forking) return
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
  }

  const handlePenSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = penDraft.trim()
    if (!name) return
    localStorage.setItem(`penname:${room_id}`, name)
    setPenName(name)
    closePenModal()
  }

    const room_id = params.room_id
    const socketRef = useRef<any>(null)
    const lockStateRef = useRef<'open' | 'self' | 'other'>('open')
    const penNameRef = useRef<string>('')
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

    const getRoomStatus = useCallback(() => {
        const segments = parseStoryContent(story.story_content || '')
        const uniqueAuthors = Array.from(new Set(segments.map((s) => s.author)))
        const contributor = !!penName && uniqueAuthors.includes(penName)
        const full = uniqueAuthors.length >= 12
        return { segments, uniqueAuthors, isContributor: contributor, isRoomFull: full }
    }, [story.story_content, penName])

    useEffect(() => {
        lockStateRef.current = lockState
    }, [lockState])

    useEffect(() => {
        penNameRef.current = penName
    }, [penName])


    useEffect(() => {
        if (socketRef.current) return
        const socket = setUpSocket(room_id)
        if (!socket) return
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
            if (socket.readyState === 1 && lockStateRef.current === 'self' && penNameRef.current) {
                socket.send(JSON.stringify({
                    type: "stop_editing",
                    user: penNameRef.current,
                }))
            }
            socket.removeEventListener("message", handleMessage)
            socket.close()
            socketRef.current = null
        }
    }, [room_id, penName])

    useEffect(() => {
        const onBeforeUnload = () => {
            const socket = socketRef.current
            if (!socket) return
            if (socket.readyState === 1 && lockStateRef.current === 'self' && penNameRef.current) {
                socket.send(JSON.stringify({
                    type: "stop_editing",
                    user: penNameRef.current,
                }))
            }
        }

        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [])

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

    // Effect 1: Start/clear the lock-release timeout (runs only when lockState/content change)
    useEffect(() => {
        if (lockState === 'self' && content.trim().length === 0) {
            if (!lockTimeoutRef.current) {
                setLockCountdown(LOCK_TIMEOUT_MS / 1000)
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
        } else {
            if (lockTimeoutRef.current) {
                clearTimeout(lockTimeoutRef.current)
                lockTimeoutRef.current = null
            }
            setLockCountdown(0)
        }

        return () => {
            if (lockTimeoutRef.current) {
                clearTimeout(lockTimeoutRef.current)
                lockTimeoutRef.current = null
            }
        }
    }, [lockState, content, penName, room_id])

    // Effect 2: Visual countdown tick (runs only when lockState changes)
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null

        if (lockState === 'self' && content.trim().length === 0) {
            intervalId = setInterval(() => {
                setLockCountdown((prev) => (prev > 0 ? prev - 1 : 0))
            }, 1000)
        }

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [lockState, content])

  // Clear typing status when lock is released (user stops editing without submitting)
  useEffect(() => {
    if (lockState !== 'self' && content.trim().length === 0) {
      upsertStatus(room_id, 'Idle')
    }
  }, [lockState, content, penName, room_id])

  // Reading mode keyboard navigation
  useEffect(() => {
    if (!readingMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const { segments } = getRoomStatus()
      let paragraphCount = 0
      let current: Array<any> = []
      segments.forEach((seg: any) => {
        if (seg.mode === 'paragraph') {
          if (current.length > 0) paragraphCount++
          current = [seg]
        } else {
          if (current.length === 0) current = [seg]
          else current.push(seg)
        }
      })
      if (current.length > 0) paragraphCount++

      if (paragraphCount === 0) return

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        setCurrentParagraphIdx((prev) => Math.min(prev + 1, paragraphCount - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        setCurrentParagraphIdx((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Home') {
        e.preventDefault()
        setCurrentParagraphIdx(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setCurrentParagraphIdx(paragraphCount - 1)
      } else if (e.key === 'Escape') {
        setReadingMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingMode, getRoomStatus])

  // Reading mode auto-scroll to current paragraph
  useEffect(() => {
    if (!readingMode) return
    const el = paragraphRefs.current[currentParagraphIdx]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentParagraphIdx, readingMode])

  // Reading mode swipe navigation (mobile)
  useEffect(() => {
    if (!readingMode) return

    let startY = 0
    let startX = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY
      const endX = e.changedTouches[0].clientX
      const deltaY = startY - endY
      const deltaX = Math.abs(startX - endX)

      // Only trigger on vertical swipes with sufficient distance and not horizontal
      if (Math.abs(deltaY) > 50 && deltaX < 50) {
        const { segments } = getRoomStatus()
        let paragraphCount = 0
        let current: Array<any> = []
        segments.forEach((seg: any) => {
          if (seg.mode === 'paragraph') {
            if (current.length > 0) paragraphCount++
            current = [seg]
          } else {
            if (current.length === 0) current = [seg]
            else current.push(seg)
          }
        })
        if (current.length > 0) paragraphCount++

        if (paragraphCount === 0) return

        // Swipe up = next paragraph, swipe down = previous paragraph
        if (deltaY > 0) {
          setCurrentParagraphIdx((prev) => Math.min(prev + 1, paragraphCount - 1))
        } else {
          setCurrentParagraphIdx((prev) => Math.max(prev - 1, 0))
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [readingMode, getRoomStatus])

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
        if (saving) return
        setSaving(true)
        try {
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
        } finally {
            setSaving(false)
        }
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
        <div className="content-column">
            
            {!readingMode && <Header/>}
            <Modal isOpen={isOpen} onRequestClose={closeModal} style={modalStyles} contentLabel="Confirm contribution" >
          <form className="sheet max-h-[85vh] overflow-y-auto" onSubmit={saveEdits}>
            <div className="sheet-header">
              <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-muted)]">Confirm</p>
              <h2 className="ink-title text-2xl mt-1">Add this to the story?</h2>
              <p className="text-small text-[var(--text-muted)] mt-1">
                Once submitted, this piece can’t be edited — but others can build on it.
              </p>
            </div>
            <div className="sheet-content">
              {saveError && (
                <div className="mb-4 text-sm text-[var(--accent)]" role="alert">
                  {saveError}
                </div>
              )}
              <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-[var(--border)] mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={deleteEdits}
                >
                  Clear Draft
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Adding…' : 'Add to Story'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
            <Modal isOpen={isForkOpen} onRequestClose={closeForkModal} style={modalStyles} contentLabel="Fork story" >
          <form className="sheet max-h-[85vh] overflow-y-auto" onSubmit={handleForkSubmit}>
            <div className="sheet-header">
              <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-muted)]">Fork Story</p>
              <h2 className="ink-title text-2xl mt-1">Name your fork</h2>
              <p className="text-small text-[var(--text-muted)] mt-1">
                This creates a new story starting from the current one.
              </p>
            </div>
            <div className="sheet-content">
              {forkError && (
                <div className="mb-4 text-sm text-[var(--accent)]" role="alert">
                  {forkError}
                </div>
              )}
              <input
                type="text"
                placeholder={`${story.story_title} (Fork)`}
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
                className="input"
              />
              <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-[var(--border)] mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeForkModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forking}
                  className="btn btn-primary"
                >
                  {forking ? 'Forking…' : 'Create Fork'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
            <Modal isOpen={isPenOpen} onRequestClose={closePenModal} style={modalStyles} contentLabel="Update pen name" >
          <form className="sheet max-h-[85vh] overflow-y-auto" onSubmit={handlePenSubmit}>
            <div className="sheet-header">
              <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-muted)]">Pen Name</p>
              <h2 className="ink-title text-2xl mt-1">Update your pen name</h2>
              <p className="text-small text-[var(--text-muted)] mt-1">
                This only changes your name for this story.
              </p>
            </div>
            <div className="sheet-content">
              <input
                type="text"
                placeholder="Pen name"
                value={penDraft}
                onChange={(e) => setPenDraft(e.target.value)}
                className="input"
              />
              <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-[var(--border)] mt-4">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closePenModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </Modal>
            {story.story_content ?
            <div className="min-h-screen flex flex-col py-2 mb-20">
                <div className="mt-6 px-2 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-2 md:space-x-3 flex-wrap gap-2">
                        <Link href="/" className="btn btn-ghost text-xs px-2 py-1">←</Link>
                        <span className="badge badge-muted">
                            #{story.genre}
                        </span>
                        {penName && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPenDraft(penName)
                                    setIsPenOpen(true)
                                }}
                                className="btn btn-ghost text-xs"
                            >
                                Pen name: {penName}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => setReadingMode((prev) => !prev)}
                            className={`btn ${readingMode ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            {readingMode ? 'Exit Reading Mode' : 'Reading Mode'}
                        </button>
                        <button
                            type="button"
                            disabled={forking}
                            onClick={() => {
                              if (forking) return
                              setForkName('')
                              setIsForkOpen(true)
                            }}
                            className="btn btn-secondary"
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
                        <div className="px-2 mt-2 text-small text-[var(--text-muted)]">
                            Forked from: {match[1].trim()}
                        </div>
                    )
                })()}
                {!readingMode && (
                    <div className="px-2 mt-3">
                        {lockState === 'self' && (
                            <span className="badge badge-accent">
                              <span className="status-dot status-typing mr-1.5" />
                              Your turn
                            </span>
                        )}
                        {lockState === 'open' && (
                            <span className="text-small text-[var(--text-muted)]">
                                Story is open — claim the turn when ready.
                            </span>
                        )}
                        {lockState === 'other' && (
                            <span className="badge" style={{ background: 'var(--selection)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                              Someone else is writing right now.
                            </span>
                        )}
                    </div>
                )}
                <div className="mt-6">
                    <aside>
                        <details>
                            <summary className="cursor-pointer text-micro uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
                                Contributors
                                <span className="text-[var(--text-faint)]">{getRoomStatus().uniqueAuthors.length}/12</span>
                            </summary>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {getRoomStatus().uniqueAuthors.map((name) => {
                                  const authorColor = colorForAuthor(name)
                                  return (
                                    <button
                                      key={name}
                                      onMouseEnter={() => setHoverAuthor(name)}
                                      onMouseLeave={() => setHoverAuthor(null)}
                                      className="contributor-mark badge badge-muted flex items-center gap-2"
                                      style={{ borderColor: authorColor.base }}
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: authorColor.base }}
                                        aria-hidden="true"
                                      />
                                      {name}
                                    </button>
                                  )
                                })}
                            </div>
                        </details>
                    </aside>
                    <div className={readingMode ? "reading-mode leading-8 md:leading-9 text-lg md:text-xl" : "leading-7 md:leading-8 text-base md:text-lg"}>
                    {readingMode && (
                      <div className="mb-6 flex justify-center px-2">
                        <span className="text-micro text-[var(--text-faint)] flex items-center gap-4">
                          <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]">↑/↓</kbd>
                          <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]">j/k</kbd>
                          <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]">Home/End</kbd>
                          <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]">Click</kbd>
                          <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]">Esc</kbd>
                        </span>
                        <span className="sr-only">Reading mode navigation: press up arrow or j for previous paragraph, down arrow or k for next paragraph, Home for first, End for last, click a paragraph to select it, Escape to exit reading mode.</span>
                      </div>
                    )}
                      <div className='mt-2 leading-8 text-normal '>
                        {(() => {
                          const { segments, uniqueAuthors, isContributor, isRoomFull } = getRoomStatus()
                          return (
                            <>
                                {isRoomFull && !isContributor && (
                                    <div className="text-small text-[var(--text-muted)] mb-4">
                                        This story already has 12 contributors. You can read, but new contributors can&apos;t add.
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

                                    return paragraphs.map((para, pIdx) => {
                                        const isCurrentParagraph = readingMode && pIdx === currentParagraphIdx
                                        const paragraphStyle = readingMode && !isCurrentParagraph
                                            ? { opacity: 0.45, transition: 'opacity 200ms ease' }
                                            : { transition: 'opacity 200ms ease' }

                                        return (
                                            <p
                                                key={`p-${pIdx}`}
                                                ref={(el) => { paragraphRefs.current[pIdx] = el }}
                                                className={`mb-6 leading-7 ${readingMode && isCurrentParagraph ? 'relative pl-3 border-l-2 border-[var(--accent)]' : ''}`}
                                                style={paragraphStyle}
                                                onClick={() => readingMode && setCurrentParagraphIdx(pIdx)}
                                            >
                                                {readingMode && isCurrentParagraph && (
                                                  <span className="absolute -left-3 top-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                                                )}
                                                {para.map((seg: any, sIdx: number) => {
                                                    const isHoverHighlighted = hoverAuthor === seg.author
                                                    const isOwnHighlighted = highlightOwn && penName && seg.author === penName
                                                    const isCurrentLine = readingMode && isCurrentParagraph && sIdx === para.length - 1
                                                    const authorColor = colorForAuthor(seg.author)
                                                    return (
                                                        <span
                                                            key={`${seg.author}-${pIdx}-${sIdx}`}
                                                            onMouseEnter={() => setHoverAuthor(seg.author)}
                                                            onMouseLeave={() => setHoverAuthor(null)}
                                                            className="group relative whitespace-pre-wrap py-0.5 rounded"
                                                            style={{
                                                                background: isCurrentLine ? 'var(--focus-line)'
                                                                  : isHoverHighlighted ? authorColor.bg
                                                                  : isOwnHighlighted ? 'var(--selection)'
                                                                  : 'transparent'
                                                            }}
                                                            title={seg.author}
                                                        >
                                                            {sIdx > 0 ? ' ' : ''}
                                                            <span className="contributor-mark">
                                                              {seg.text}
                                                            </span>
                                                            <span className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-[var(--text)] text-[var(--bg)] text-xs opacity-0 group-hover:opacity-90 transition-opacity pointer-events-none">
                                                                {seg.author}
                                                            </span>
                                                        </span>
                                                    )
                                                })}
                                            </p>
                                        )
                                    })
                                })()}
                            </>
                        )
                      })()}
                      </div>
                    </div>
                    {readingMode && (
                      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10" role="navigation" aria-label="Paragraph navigation">
                        {(() => {
                          const { segments } = getRoomStatus()
                          let paragraphCount = 0
                          let current: Array<any> = []
                          segments.forEach((seg: any) => {
                            if (seg.mode === 'paragraph') {
                              if (current.length > 0) paragraphCount++
                              current = [seg]
                            } else {
                              if (current.length === 0) current = [seg]
                              else current.push(seg)
                            }
                          })
                          if (current.length > 0) paragraphCount++
                          return Array.from({ length: paragraphCount }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentParagraphIdx(i)}
                              className={`w-2 h-2 rounded-full transition-all ${i === currentParagraphIdx ? 'bg-[var(--text)]' : 'bg-[var(--text-faint)] hover:bg-[var(--text-muted)]'}`}
                              aria-label={"Go to paragraph " + (i + 1)}
                              aria-current={i === currentParagraphIdx ? 'true' : 'false'}
                            />
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                {!readingMode && (
                <div className="mt-8 mb-4 px-2 relative">
                    {lockState === 'self' && content.trim().length > 0 && (
                        <div className="mb-3 flex items-center space-x-3">
                            <span className="badge" style={{ background: 'var(--selection)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                                You are the only one writing right now.
                            </span>
                            <label className="flex items-center space-x-2 cursor-pointer text-small text-[var(--text-muted)]">
                                <input
                                    type="checkbox"
                                    checked={highlightOwn}
                                    onChange={(e) => setHighlightOwn(e.target.checked)}
                                    className="accent-[var(--accent)]"
                                />
                                <span>Highlight my contributions</span>
                            </label>
                        </div>
                    )}
                    {(() => {
                        const { isContributor, isRoomFull } = getRoomStatus()
                        if (isRoomFull && !isContributor) {
                            return (
                                <div className="surface flex items-center justify-center text-sm min-h-40 w-full text-[var(--text-muted)]">
                                    Read-only: this story is full.
                                </div>
                            )
                        }
                        return (
                            !penName ? (
                                <div className="surface flex items-center justify-center text-sm min-h-40 w-full text-[var(--text-muted)] border border-[var(--accent)]">
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
                                socketRef.current?.readyState === 1 ? (
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
                                        className="flex items-center justify-center text-sm font-medium min-h-40 w-full text-[var(--success)] border-2 border-[var(--success)] bg-transparent hover:border-[var(--success)] hover:bg-[var(--success)]/10 hover:scale-[1.02] rounded-xl transition-all duration-200"
                                    >
                                        Tap to start writing
                                    </button>
                                ) : null
                            ) : (
                                <div className="surface flex items-center justify-center text-sm min-h-40 border border-[var(--border)]">
                                    <div className="flex flex-col items-center space-y-3 text-[var(--text-muted)]">
                                        <span className="text-base">Waiting on the writer…</span>
                                        <span className="flex items-center space-x-2">
                                            <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce [animation-delay:-0.2s]"></span>
                                            <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce"></span>
                                            <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce [animation-delay:0.2s]"></span>
                                        </span>
                                    </div>
                                </div>
                            )
                        )
                    })()}
                </div>
                )}
                {!readingMode && lockState === 'self' && (
                    <div className="flex flex-col items-center justify-center text-small text-[var(--text-muted)] px-2 mt-3 space-y-4">
                        
                        <div className="text-center text-small text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--text)]">Continue</span> keeps you in the same paragraph.{" "}
                            <span className="font-semibold text-[var(--text)]">New paragraph</span> starts a fresh line.
                        </div>
                        <div className="flex items-center justify-center space-x-3">
                            <button
                                type="button"
                                onClick={() => setStartMode('continue')}
                                className={`btn ${startMode === 'continue' ? 'btn-primary' : 'btn-secondary'}`}
                                aria-label="Continue mode: keep writing in the same paragraph"
                            >
                                <span className="text-xs px-2 py-0.5 border border-[var(--border)]" aria-hidden="true">↩︎</span>
                                <span>Continue</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStartMode('paragraph')}
                                className={`btn ${startMode === 'paragraph' ? 'btn-primary' : 'btn-secondary'}`}
                                aria-label="New paragraph mode: start a fresh line"
                            >
                                <span className="text-xs px-2 py-0.5 border border-[var(--border)]" aria-hidden="true">¶</span>
                                <span>New paragraph</span>
                            </button>
                            {lockCountdown > 0 && (
                                <div
                                    className="h-10 w-10 border border-[var(--text)] rounded-full"
                                    style={{
                                        background: "conic-gradient(var(--text-muted) " + Math.round((lockCountdown / (LOCK_TIMEOUT_MS / 1000)) * 360) + "deg, var(--border) 0deg)"
                                    }}
                                    aria-label={"Time remaining: " + lockCountdown + " seconds"}
                                ></div>
                            )}
                        </div>
                    </div>
                )}
                {!readingMode && lockState === 'other' && (
                    <div className="text-[var(--text-muted)] flex text-small  justify-center px-4 transform transition ease-in">
                        Another user is currently writing. You can start once they submit.
                    </div>
                )}
                
                {!readingMode && lockState === 'self' && content.trim().length > 0 &&
                        <>
                            <div className="w-full flex justify-center px-2 font-bold mt-6">
                                <motion.div whileHover={{ x: 1 , y: 1}}>
                                    <button onClick={() => setIsOpen(true)} className="btn btn-primary px-8 py-4">
                                        <p className="pr-2 uppercase tracking-[0.2em] text-sm"> Add to Story </p>
                                    </button>
                                </motion.div>       
                            </div>
                        </>
                }
                
            </div> :
            <div className="content-column min-h-[60vh] flex justify-center items-center">
                
            </div>
            }
        </div>
    )

   
}

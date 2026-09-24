'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from 'react-modal'
import { motion } from 'framer-motion'

import StoryEditor from '@/app/components/StoryEditor'
import Header from '@/app/components/Header'
import { setUpSocket } from '@/utils/socket'
import { supabaseClient } from '@/utils/db/supabase'
import { getStory, upsertStatus, createNewRoom } from '@/utils/db/actions'

/* -------------------------------------------------------------------------- */
/*  Layout system                                                              */
/*  One column, one left edge. Spacing steps: 2 / 4 / 8 (Tailwind units).      */
/* -------------------------------------------------------------------------- */

const LOCK_TIMEOUT_MS = 60000
const MAX_CONTRIBUTORS = 12
const kbdClass =
  'px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[10px]'
const penButtonClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-xs hover:bg-[var(--selection)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all'

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
}

type Mode = 'continue' | 'paragraph'
type LockState = 'open' | 'self' | 'other'
type Segment = { author: string; text: string; mode: Mode; at?: string }

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

const colorForAuthor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  const hue = Math.abs(hash) % 360
  return {
    base: `hsl(${hue}, 70%, 45%)`,
    bg: `hsla(${hue}, 85%, 75%, 0.35)`,
  }
}

const parseStoryContent = (raw: string): Segment[] => {
  if (!raw) return []
  const cleaned = raw.replace(/\[forked-from:[^\]]+\]/g, '')
  const parsed: Segment[] = []
  const regex = /\[pen:([^|\]]+)(?:\|mode:(continue|paragraph))?(?:\|at:([^\]]+))?\]/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  let lastAuthor = 'Unknown'
  let lastMode: Mode = 'continue'
  let lastAt: string | undefined

  while ((match = regex.exec(cleaned)) !== null) {
    const before = cleaned.slice(lastIndex, match.index).trim()
    if (before) parsed.push({ author: lastAuthor, text: before, mode: lastMode, at: lastAt })
    lastAuthor = match[1].trim()
    lastMode = (match[2] as Mode | undefined) || 'continue'
    lastAt = match[3]
    lastIndex = regex.lastIndex
  }

  const tail = cleaned.slice(lastIndex).trim()
  if (tail) parsed.push({ author: lastAuthor, text: tail, mode: lastMode, at: lastAt })
  return parsed
}

const groupParagraphs = (segments: Segment[]): Segment[][] => {
  const paragraphs: Segment[][] = []
  let current: Segment[] = []
  segments.forEach((seg) => {
    if (seg.mode === 'paragraph' && current.length > 0) {
      paragraphs.push(current)
      current = []
    }
    current.push(seg)
  })
  if (current.length > 0) paragraphs.push(current)
  return paragraphs
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function Sheet({
  isOpen,
  onClose,
  label,
  title,
  description,
  onSubmit,
  children,
  actions,
}: {
  isOpen: boolean
  onClose: () => void
  label: string
  title: string
  description: string
  onSubmit: (e: React.FormEvent) => void
  children?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={modalStyles} contentLabel={label}>
      <form className="sheet max-h-[85vh] overflow-y-auto" onSubmit={onSubmit}>
        <div className="sheet-header">
          <p className="text-micro text-[var(--text-muted)]">{label}</p>
          <h2 className="ink-title text-2xl mt-1">{title}</h2>
          <p className="text-small text-[var(--text-muted)] mt-1">{description}</p>
        </div>
        <div className="sheet-content flex flex-col gap-4">
          {children}
          <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-4 border-t border-[var(--border)]">
            {actions}
          </div>
        </div>
      </form>
    </Modal>
  )
}

const PenIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0 text-[var(--text-faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

const ForkIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M6 3v12" />
    <path d="M18 9v6" />
    <path d="M6 13a6 6 0 0 0 12 0" />
    <path d="M18 3a6 6 0 0 1-12 0" />
  </svg>
)

const ThreeDotsIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
)

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page({ params }: { params: { room_id: string } }) {
  const room_id = params.room_id
  const router = useRouter()
  const supabase = supabaseClient

  // Story + editing state
  const [story, setStory] = useState<any>({})
  const [editable, setEditable] = useState(false)
  const [lockState, setLockState] = useState<LockState>('open')
  const [, setCurrentlyEditing] = useState(false)
  const [clearContent, setClearContent] = useState(false)
  const [content, setContent] = useState('')
  const [lockCountdown, setLockCountdown] = useState(0)
  const [penName, setPenName] = useState('')
  const [startMode, setStartMode] = useState<Mode>('continue')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Reading mode
  const [readingMode, setReadingMode] = useState(false)
  const [currentParagraphIdx, setCurrentParagraphIdx] = useState(0)
  const [hoverAuthor, setHoverAuthor] = useState<string | null>(null)

  // Modals
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isForkOpen, setIsForkOpen] = useState(false)
  const [isPenOpen, setIsPenOpen] = useState(false)
  const [forkName, setForkName] = useState('')
  const [forkError] = useState('')
  const [forking, setForking] = useState(false)
  const [penDraft, setPenDraft] = useState('')

  // Refs
  const socketRef = useRef<any>(null)
  const lockStateRef = useRef<LockState>('open')
  const penNameRef = useRef('')
  const contentRef = useRef('')
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ------------------------------ Derived data ----------------------------- */

  const { segments, uniqueAuthors, isContributor, isRoomFull } = useMemo(() => {
    const segs = parseStoryContent(story.story_content || '')
    const authors = Array.from(new Set(segs.map((s) => s.author)))
    return {
      segments: segs,
      uniqueAuthors: authors,
      isContributor: !!penName && authors.includes(penName),
      isRoomFull: authors.length >= MAX_CONTRIBUTORS,
    }
  }, [story.story_content, penName])

  const paragraphs = useMemo(() => groupParagraphs(segments), [segments])
  const paragraphCount = paragraphs.length
  const forkedFrom = story.story_content?.match(/\[forked-from:([^\]]+)\]/)?.[1]?.trim()
  const readOnly = isRoomFull && !isContributor

  /* ------------------------------ Modal actions ---------------------------- */

  const closeForkModal = () => {
    setIsForkOpen(false)
    setForkName('')
  }

  const closePenModal = () => {
    setIsPenOpen(false)
    setPenDraft('')
  }

  const openPenModal = (draft: string) => {
    setPenDraft(draft)
    setIsPenOpen(true)
  }

  const handleForkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (forking) return
    setForking(true)
    try {
      const forkTitle = (forkName || `${story.story_title} (Fork)`).trim()
      const forkContent = `${story.story_content || ''}\n\n[forked-from:${story.story_title}]`
      const created = await createNewRoom(forkTitle, story.story_content || '', story.genre || '')
      const newRoomId = created?.[0]?.room_id
      if (!newRoomId) return
      await supabase.from('Rooms').update({ story_content: forkContent }).eq('room_id', newRoomId)
      if (penName) localStorage.setItem(`penname:${newRoomId}`, penName)
      router.push(`/room/${newRoomId}`)
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

  /* ------------------------------ Data loading ----------------------------- */

  const getStoryFromDB = useCallback(async () => {
    const result = await getStory(room_id)
    if (result) setStory(result[0])
  }, [room_id])

  useEffect(() => {
    getStoryFromDB()
  }, [getStoryFromDB])

  useEffect(() => {
    if (!room_id) return
    const saved = localStorage.getItem(`penname:${room_id}`)
    if (saved) setPenName(saved)
  }, [room_id])

  useEffect(() => {
    if (!room_id) return
    const channel = supabase
      .channel(`room-updates-${room_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Rooms', filter: `room_id=eq.${room_id}` },
        (payload) => {
          if (payload?.new) setStory((prev: any) => ({ ...prev, ...payload.new }))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe().catch(() => {})
    }
  }, [room_id, supabase])

  /* --------------------------------- Socket -------------------------------- */

  useEffect(() => {
    lockStateRef.current = lockState
  }, [lockState])

  useEffect(() => {
    penNameRef.current = penName
  }, [penName])

  const releaseLock = useCallback(() => {
    const socket = socketRef.current
    if (socket?.readyState === 1 && lockStateRef.current === 'self' && penNameRef.current) {
      socket.send(JSON.stringify({ type: 'stop_editing', user: penNameRef.current }))
    }
  }, [])

  useEffect(() => {
    if (socketRef.current) return
    const socket = setUpSocket(room_id)
    if (!socket) return
    socketRef.current = socket

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data?.type !== 'lock') return
        const activeUser = data?.activeUser
        if (!activeUser) {
          setLockState('open')
          setEditable(false)
          setCurrentlyEditing(false)
        } else if (activeUser === penName) {
          setLockState('self')
          setEditable(true)
        } else {
          setLockState('other')
          setEditable(false)
          setCurrentlyEditing(false)
          setContent('')
          setClearContent(true)
        }
      } catch {
        // ignore non-json messages
      }
    }

    socket.addEventListener('message', handleMessage)

    return () => {
      releaseLock()
      socket.removeEventListener('message', handleMessage)
      socket.close()
      socketRef.current = null
    }
  }, [room_id, penName, releaseLock])

  useEffect(() => {
    window.addEventListener('beforeunload', releaseLock)
    return () => window.removeEventListener('beforeunload', releaseLock)
  }, [releaseLock])

  /* ------------------------------ Lock timeout ----------------------------- */

  const isIdleHolder = lockState === 'self' && content.trim().length === 0

  useEffect(() => {
    if (isIdleHolder) {
      if (!lockTimeoutRef.current) {
        setLockCountdown(LOCK_TIMEOUT_MS / 1000)
        lockTimeoutRef.current = setTimeout(() => {
          if (contentRef.current.trim().length === 0) {
            socketRef.current?.send(JSON.stringify({ type: 'stop_editing', user: penName }))
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
  }, [isIdleHolder, penName, room_id])

  useEffect(() => {
    if (!isIdleHolder) return
    const id = setInterval(() => setLockCountdown((prev) => (prev > 0 ? prev - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [isIdleHolder])

  // Clear typing status when the lock is released without submitting
  useEffect(() => {
    if (lockState !== 'self' && content.trim().length === 0) {
      upsertStatus(room_id, 'Idle')
    }
  }, [lockState, content, room_id])

  /* ------------------------------ Reading mode ----------------------------- */

  useEffect(() => {
    if (!readingMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
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
  }, [readingMode, paragraphCount])

  useEffect(() => {
    if (!readingMode) return
    paragraphRefs.current[currentParagraphIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentParagraphIdx, readingMode])

  useEffect(() => {
    if (!readingMode) return

    let startY = 0
    let startX = 0

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const deltaY = startY - e.changedTouches[0].clientY
      const deltaX = Math.abs(startX - e.changedTouches[0].clientX)
      if (Math.abs(deltaY) <= 50 || deltaX >= 50 || paragraphCount === 0) return

      // Swipe up = next paragraph, swipe down = previous paragraph
      if (deltaY > 0) setCurrentParagraphIdx((prev) => Math.min(prev + 1, paragraphCount - 1))
      else setCurrentParagraphIdx((prev) => Math.max(prev - 1, 0))
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [readingMode, paragraphCount])

  /* ------------------------------ Saving / drafts -------------------------- */

  const saveContributionToDB = async (updated: string) => {
    const { error } = await supabase.from('Rooms').update({ story_content: updated }).eq('room_id', room_id)
    if (error) console.error('Error saving data:', error.message)
    return { error }
  }

  const startEditing = (name: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'start_editing', user: name }))
    upsertStatus(room_id, `Typing:${new Date().toISOString()}`)
  }

  const stopEditing = () => {
    socketRef.current?.send(JSON.stringify({ type: 'stop_editing', user: penName }))
  }

  const saveEdits = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const draft = contentRef.current.trim()
      if (!draft) {
        setIsConfirmOpen(false)
        return
      }
      if (isRoomFull && !isContributor) {
        setSaveError(`This story already has ${MAX_CONTRIBUTORS} contributors. You can read, but new contributors cannot add.`)
        setIsConfirmOpen(false)
        return
      }

      const header = `[pen:${penName || 'Anonymous'}|mode:${startMode}|at:${new Date().toISOString()}]`
      const normalizedDraft = draft.replace(/\s*\n\s*/g, ' ').trim()
      const base = story.story_content.trimEnd()
      const updatedContent =
        startMode === 'continue'
          ? `${base} ${header} ${normalizedDraft}`
          : `${base}\n\n${header}\n${normalizedDraft}`

      const { error } = await saveContributionToDB(updatedContent)
      if (error) {
        setSaveError(error.message)
        return
      }

      setSaveError('')
      setStory((prev: any) => ({ ...prev, story_content: updatedContent }))
      setClearContent(true)
      stopEditing()
      upsertStatus(room_id, `Active:${new Date().toISOString()}`)
      setIsConfirmOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const deleteEdits = () => {
    setClearContent(true)
    setContent('')
    contentRef.current = ''
    stopEditing()
    upsertStatus(room_id, 'Idle')
    setSaveError('')
    setIsConfirmOpen(false)
  }

  /* --------------------------------- Render -------------------------------- */

  if (!story.story_content) {
    return <div className="content-column min-h-[60vh]" />
  }

  const socketReady = socketRef.current?.readyState === 1

  return (
    <div className="content-column">
      {!readingMode && <Header />}

      {/* Modals */}
      <Sheet
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        label="Confirm"
        title="Add this to the story?"
        description="Once submitted, this piece can’t be edited — but others can build on it."
        onSubmit={saveEdits}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={deleteEdits}>
              Clear draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add to story'}
            </button>
          </>
        }
      >
        {saveError && (
          <div className="text-sm text-[var(--accent)]" role="alert">
            {saveError}
          </div>
        )}
      </Sheet>

      <Sheet
        isOpen={isForkOpen}
        onClose={closeForkModal}
        label="Fork story"
        title="Name your fork"
        description="This creates a new story starting from the current one."
        onSubmit={handleForkSubmit}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={closeForkModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={forking}>
              {forking ? 'Forking…' : 'Create fork'}
            </button>
          </>
        }
      >
        {forkError && (
          <div className="text-sm text-[var(--accent)]" role="alert">
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
      </Sheet>

      <Sheet
        isOpen={isPenOpen}
        onClose={closePenModal}
        label="Pen name"
        title="Update your pen name"
        description="This only changes your name for this story."
        onSubmit={handlePenSubmit}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={closePenModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </>
        }
      >
        <input
          type="text"
          placeholder="Pen name"
          value={penDraft}
          onChange={(e) => setPenDraft(e.target.value)}
          className="input"
        />
      </Sheet>

      {/* Single column: every block below shares the same left and right edge */}
      <main className="mx-auto w-full max-w-3xl px-5 sm:px-8 pt-6 pb-24 flex flex-col gap-8">
        {/* Toolbar - reading mode on left */}
        <nav className="flex items-center justify-start gap-4">
          <button
            type="button"
            onClick={() => setReadingMode((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${
              readingMode ? 'btn-primary' : 'bg-gray-200 text-[var(--accent)] border-none hover:bg-[var(--accent)] hover:text-white'
            }`}
          >
            <BookIcon />
            {readingMode ? 'Exit reading mode' : 'Reading mode'}
          </button>
        </nav>

        {/* Title block with actions menu */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="ink-title text-3xl md:text-5xl">{story.story_title}</h1>
            <div className="relative group" role="menu" aria-label="Story actions">
              <button
                type="button"
                className="btn btn-ghost text-xs p-2 rounded-full"
                aria-label="Story actions"
                aria-expanded="false"
                onClick={() => {/* handled by CSS hover */}}
              >
                <ThreeDotsIcon />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  type="button"
                  disabled={forking}
                  onClick={() => {
                    setForkName('')
                    setIsForkOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--selection)] hover:text-[var(--accent)]"
                >
                  <ForkIcon />
                  Fork story
                </button>
              </div>
            </div>
          </div>
          {(story.genre || forkedFrom) && (
            <div className="flex flex-col gap-1 text-small text-[var(--text-muted)] pl-2">
              {story.genre && <span className="text-[var(--text-faint)]">#{story.genre}</span>}
              {forkedFrom && <span>Forked from {forkedFrom}</span>}
            </div>
          )}
          {!readingMode && lockState === 'self' && (
            <span className="flex items-center gap-2 text-small text-[var(--accent)] pl-2 ">
              <span className="status-dot status-typing" />
              Your turn
            </span>
          )}
          {!readingMode && lockState === 'other' && (
            <span
              className="badge self-start"
              style={{ background: 'var(--selection)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              Someone else is writing right now.
            </span>
          )}
        </header>

        {/* Contributors */}
        {!readingMode && (
          <details>
            <summary className="cursor-pointer text-micro text-[var(--text-muted)] flex items-center gap-2 pl-2">
              Contributors
              <span className="text-[var(--text-faint)]">
                {uniqueAuthors.length}/{MAX_CONTRIBUTORS}
              </span>
            </summary>
            <div className="mt-4 flex flex-wrap gap-2">
              {uniqueAuthors.map((name) => {
                const color = colorForAuthor(name)
                return (
                  <button
                    key={name}
                    onMouseEnter={() => setHoverAuthor(name)}
                    onMouseLeave={() => setHoverAuthor(null)}
                    className="contributor-mark badge badge-muted flex items-center gap-2"
                    style={{ borderColor: color.base }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: color.base }} aria-hidden="true" />
                    {name}
                  </button>
                )
              })}
            </div>
          </details>
        )}

        {/* Story */}
        <article
          className={
            readingMode
              ? 'reading-mode leading-8 md:leading-9 text-lg md:text-xl'
              : 'leading-7 md:leading-8 text-base md:text-lg'
          }
        >
          {readingMode && (
            <div className="mb-2 flex items-center gap-4 text-micro text-[var(--text-faint)]">
              <kbd className={kbdClass}>↑/↓</kbd>
              <kbd className={kbdClass}>j/k</kbd>
              <kbd className={kbdClass}>Home/End</kbd>
              <kbd className={kbdClass}>Click</kbd>
              <kbd className={kbdClass}>Esc</kbd>
              <span className="sr-only">
                Reading mode navigation: press up arrow or k for previous paragraph, down arrow or j for next
                paragraph, Home for first, End for last, click a paragraph to select it, Escape to exit reading mode.
              </span>
            </div>
          )}

          {readOnly && (
            <p className="mb-6 text-small text-[var(--text-muted)]">
              This story already has {MAX_CONTRIBUTORS} contributors. You can read, but new contributors can&apos;t add.
            </p>
          )}

          {paragraphs.map((para, pIdx) => {
            const isCurrent = readingMode && pIdx === currentParagraphIdx
            return (
              <p
                key={`p-${pIdx}`}
                ref={(el) => {
                  paragraphRefs.current[pIdx] = el
                }}
                className={`mb-6 ${isCurrent ? 'relative pl-3 border-l-2 border-[var(--accent)]' : ''}`}
                style={{
                  opacity: readingMode && !isCurrent ? 0.45 : 1,
                  transition: 'opacity 200ms ease',
                }}
                onClick={() => readingMode && setCurrentParagraphIdx(pIdx)}
              >
                {isCurrent && (
                  <span className="absolute -left-3 top-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                )}
                {para.map((seg, sIdx) => {
                  const isCurrentLine = isCurrent && sIdx === para.length - 1
                  const color = colorForAuthor(seg.author)
                  return (
                    <span
                      key={`${seg.author}-${pIdx}-${sIdx}`}
                      onMouseEnter={() => setHoverAuthor(seg.author)}
                      onMouseLeave={() => setHoverAuthor(null)}
                      className="group relative whitespace-pre-wrap py-0.5 rounded"
                      style={{
                        background: isCurrentLine
                          ? 'var(--focus-line)'
                          : hoverAuthor === seg.author
                            ? color.bg
                            : 'transparent',
                      }}
                      title={seg.author}
                    >
                      {sIdx > 0 ? ' ' : ''}
                      <span className="contributor-mark">{seg.text}</span>
                      <span className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-[var(--text)] text-[var(--bg)] text-xs opacity-0 group-hover:opacity-90 transition-opacity pointer-events-none">
                        {seg.author}
                      </span>
                    </span>
                  )
                })}
              </p>
            )
          })}
        </article>

        {/* Writing area */}
        {!readingMode && !readOnly && (
          <section className="flex flex-col gap-4">
            {!penName ? (
              <div className="surface flex items-center justify-center text-sm min-h-40 w-full text-[var(--text-muted)] border border-[var(--accent)]">
                Choose a pen name from the main page to write.
              </div>
            ) : lockState === 'self' ? (
              <>
                {/* Start mode selector - above editor */}
                <div className="flex flex-col gap-2 mb-4" role="group" aria-label="Where should your writing go?">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStartMode('continue')}
                      className={`inline-flex items-center gap-1.5 btn ${startMode === 'continue' ? 'btn-primary' : 'btn-secondary'}`}
                      aria-label="Continue mode: keep writing in the same paragraph"
                      aria-pressed={startMode === 'continue'}
                    >
                      <span aria-hidden="true">↩︎</span>
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartMode('paragraph')}
                      className={`inline-flex items-center gap-1.5 btn ${startMode === 'paragraph' ? 'btn-primary' : 'btn-secondary'}`}
                      aria-label="New paragraph mode: start a fresh line"
                      aria-pressed={startMode === 'paragraph'}
                    >
                      <span aria-hidden="true">¶</span>
                      New paragraph
                    </button>
                  </div>
                  <p className="text-micro text-[var(--text-muted)]">
                    Continue appends to the current paragraph. New paragraph starts a fresh line.
                  </p>
                </div>

                <StoryEditor
                  story={story}
                  setCurrentlyEditing={setCurrentlyEditing}
                  clearContent={clearContent}
                  setClearContent={setClearContent}
                  editable={editable}
                  onStartEditing={() => startEditing(penName)}
                  onContentChange={(text) => {
                    contentRef.current = text
                    setContent(text)
                  }}
                />

                <div className="flex items-center justify-between gap-4">
                  <button type="button" onClick={() => openPenModal(penName)} className={penButtonClass}>
                    <PenIcon />
                    Pen name: {penName}
                  </button>
                  {lockCountdown > 0 && (
                    <div
                      className="h-7 w-7 border border-[var(--text)] rounded-full shrink-0"
                      style={{
                        background: `conic-gradient(var(--text-muted) ${Math.round(
                          (lockCountdown / (LOCK_TIMEOUT_MS / 1000)) * 360
                        )}deg, var(--border) 0deg)`,
                      }}
                      aria-label={`Time remaining: ${lockCountdown} seconds`}
                    />
                  )}
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-[var(--border)]">
                  {content.trim().length > 0 && (
                    <motion.div whileHover={{ x: 1, y: 1 }}>
                      <button type="button" onClick={() => setIsConfirmOpen(true)} className="btn" style={{ background: "var(--success)", color: "white", borderColor: "var(--success)" }}>
                        Add to story
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            ) : lockState === 'open' ? (
              socketReady && (
                <button
                  type="button"
                  onClick={() => startEditing(penName.trim())}
                  className="flex items-center justify-center text-sm font-medium min-h-40 w-full text-[var(--success)] border-2 border-[var(--success)] bg-transparent hover:bg-[var(--success)]/10 rounded-xl transition-colors duration-200"
                >
                  Tap to start writing
                </button>
              )
            ) : (
              <>
                <div className="surface flex items-center justify-center text-sm min-h-40 border border-[var(--border)]">
                  <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
                    <span className="text-base">Waiting on the writer…</span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-[var(--text)] animate-bounce [animation-delay:0.2s]" />
                    </span>
                  </div>
                </div>
                <p className="text-small text-[var(--text-muted)]">
                  Another user is currently writing. You can start once they submit.
                </p>
              </>
            )}
          </section>
        )}

        {!readingMode && readOnly && (
          <div className="surface flex items-center justify-center text-sm min-h-40 w-full text-[var(--text-muted)]">
            Read-only: this story is full.
          </div>
        )}
      </main>

      {/* Reading mode paragraph dots */}
      {readingMode && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10"
          role="navigation"
          aria-label="Paragraph navigation"
        >
          {Array.from({ length: paragraphCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentParagraphIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentParagraphIdx ? 'bg-[var(--text)]' : 'bg-[var(--text-faint)] hover:bg-[var(--text-muted)]'
              }`}
              aria-label={`Go to paragraph ${i + 1}`}
              aria-current={i === currentParagraphIdx ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  )
}



export default function Loading() {
  return (
    <div className="min-h-screen relative flex justify-center items-center">
      <div className="flex items-center space-x-2 text-[var(--text)]">
        <span className="text-small">typing</span>
        <span className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text)] animate-bounce [animation-delay:-0.2s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text)] animate-bounce"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text)] animate-bounce [animation-delay:0.2s]"></span>
        </span>
      </div>
    </div>
  )
}

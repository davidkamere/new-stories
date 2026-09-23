"use client"

import { useState, useEffect, useCallback } from "react"
import { getStatus } from "@/utils/db/actions";

type StoryProps = {
  title: string;
  content?: string;
  created_at: string;
  genre?: string;
  room_id?: string;
  payload?: any;
  listView?: boolean;
};

const Story = ({ title, content, created_at, genre, room_id, payload, listView }: StoryProps) => {
  const [complete, setComplete] = useState(false);
  const [typing, setTyping] = useState(false);
  const [recentlyActive, setRecentlyActive] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const getStatusFromDb = useCallback(async () => {
    if (!room_id) return;
    const dbStatus = await getStatus(room_id as string);
    dbStatus && setStatus(dbStatus[0]);
  }, [room_id]);

  useEffect(() => {
    getStatusFromDb();
  }, [getStatusFromDb]);

  useEffect(() => {
    if (payload && payload?.room_id === room_id) {
      if (payload?.status === 'Complete') {
        setComplete(true);
      } else {
        setComplete(false);
      }
      const statusValue = payload?.status || '';
      if (statusValue.startsWith('Typing:')) {
        const ts = statusValue.replace('Typing:', '').trim();
        const typingAt = new Date(ts).getTime();
        setTyping(Date.now() - typingAt < 2 * 60 * 1000);
      } else {
        setTyping(false);
      }
      if (statusValue.startsWith('Active:')) {
        const ts = statusValue.replace('Active:', '').trim();
        const activeAt = new Date(ts).getTime();
        setRecentlyActive(Date.now() - activeAt < 30 * 60 * 1000);
      } else {
        setRecentlyActive(false);
      }
    }
  }, [payload, room_id]);

  useEffect(() => {
    if (status && status?.status === 'Complete') {
      setComplete(true);
    } else {
      setComplete(false);
    }
    const statusValue = status?.status || '';
    if (statusValue.startsWith('Typing:')) {
      const ts = statusValue.replace('Typing:', '').trim();
      const typingAt = new Date(ts).getTime();
      setTyping(Date.now() - typingAt < 2 * 60 * 1000);
    } else {
      setTyping(false);
    }
    if (statusValue.startsWith('Active:')) {
      const ts = statusValue.replace('Active:', '').trim();
      const activeAt = new Date(ts).getTime();
      setRecentlyActive(Date.now() - activeAt < 30 * 60 * 1000);
    } else {
      setRecentlyActive(false);
    }
  }, [status]);

  const getContributors = () => {
    if (!content) return [];
    const regex = /\[pen:([^|\]]+)(?:\|mode:(continue|paragraph))?\]/g;
    const contributors = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      contributors.add(match[1].trim());
    }
    return Array.from(contributors);
  };

  const contributors = getContributors();
  const isFull = contributors.length >= 12;

  // Convert to UK time
  const timestamp = new Date(created_at);
  const ukOptions = {
    timeZone: 'Europe/London',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const ukFormattedDate = timestamp.toLocaleString('en-GB', ukOptions as any);

  // Preview text - strip markup
  const previewText = content
    ?.replace(/\[pen:[^\]]+\]/g, '')
    .replace(/\[forked-from:[^\]]+\]/g, '')
    .trim()
    .slice(0, listView ? 180 : 300);

  return (
    <div className="w-full group">
      {recentlyActive && !listView && (
        <div className="badge badge-accent mb-3">
          <span className="status-dot status-active mr-1.5" />
          Recently active
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="ink-title text-lg md:text-xl leading-tight">
            {title}
          </h3>
          <div className="text-micro text-[var(--text-muted)] mt-1.5 uppercase tracking-[0.12em]">
            {ukFormattedDate}
          </div>
        </div>

        <div className="flex flex-col md:items-end md:space-y-2 shrink-0">
          {genre && (
            <span className="badge badge-muted">
              {genre}
            </span>
          )}
          {isFull && (
            <span className="badge badge-accent">Full</span>
          )}
          {complete && (
            <span className="badge badge-success">
              Complete
            </span>
          )}
        </div>
      </div>

      {!listView && previewText && (
        <p className="mt-4 text-[var(--text)] leading-relaxed line-clamp-3">
          {previewText}{content && content.length > 300 && '…'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-micro text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--text-faint)]">{contributors.length}/12</span>
          <span>contributors</span>
        </span>
        {typing && (
          <span className="flex items-center gap-1.5 text-[var(--success)]">
            <span className="status-dot status-typing" />
            <span>Typing</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default Story;
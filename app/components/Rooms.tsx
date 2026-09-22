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

const Rooms = () => {
  const [rooms, setRooms] = useState<any>([]);
  const [payload, setPayload] = useState<any>(null);
  const router = useRouter();
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const [isPenModalOpen, setIsPenModalOpen] = useState(false);
  const [penNameInput, setPenNameInput] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  useEffect(() => {
    getRoomsFromDb();
  }, []);

  const getRoomsFromDb = async () => {
    const dbRooms = await getRooms();
    setRooms(dbRooms);
  };

  useEffect(() => {
    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Status' },
        (payload) => {
          setPayload(payload.new);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch((error) => {
        console.error('Error unsubscribing:', error);
      });
    };
  }, []);

  const openPenModal = (roomId: string) => {
    const saved = localStorage.getItem(`penname:${roomId}`) || '';
    if (saved) {
      router.push(`/room/${roomId}`);
      return;
    }
    setPendingRoomId(roomId);
    setPenNameInput(saved);
    setIsPenModalOpen(true);
  };

  const closePenModal = () => {
    setIsPenModalOpen(false);
    setPendingRoomId(null);
  };

  const handleConfirmPenName = () => {
    if (!pendingRoomId) return;
    const name = penNameInput.trim();
    if (!name) return;
    localStorage.setItem(`penname:${pendingRoomId}`, name);
    setIsPenModalOpen(false);
    const target = pendingRoomId;
    setPendingRoomId(null);
    router.push(`/room/${target}`);
  };

  const filteredRooms = [...rooms]
    .filter((room: any) => genreFilter === 'All' || room.genre === genreFilter)
    .reverse();

  const uniqueGenres = Array.from(
    new Set(rooms.map((r: any) => r.genre).filter(Boolean))
  ) as string[];

  return (
    <>
      <Modal
        isOpen={isPenModalOpen}
        onRequestClose={closePenModal}
        style={modalStyles}
        contentLabel="Choose pen name"
      >
        <div className="sheet">
          <div className="sheet-header">
            <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-muted)]">Pen Name</p>
            <h2 className="ink-title text-2xl mt-1">Pick your story alias</h2>
            <p className="text-small text-[var(--text-muted)] mt-1">
              This name stays with this story only. Keep it short and memorable.
            </p>
          </div>
          <div className="sheet-content">
            <input
              type="text"
              placeholder="e.g. NightOwl"
              value={penNameInput}
              onChange={(e) => setPenNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmPenName()}
              className="input"
              autoFocus
            />
            <div className="flex flex-row justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={closePenModal}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPenName}
                className="btn btn-primary"
              >
                Enter Story
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <div className="content-column">
        {rooms?.length > 0 ? (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {['All', ...uniqueGenres].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenreFilter(g)}
                  className={`badge ${genreFilter === g ? 'badge-accent' : 'badge-muted'}`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--border)]">
              {filteredRooms.map((room: any, index) => (
                <motion.div
                  key={room.room_id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 150 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openPenModal(room.room_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPenModal(room.room_id);
                      }
                    }}
                    className="list-row flex flex-col gap-2 hover:cursor-pointer"
                  >
                    <div className="flex flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Story
                          title={room.story_title}
                          content={room.story_content}
                          created_at={room.created_at}
                          genre={room.genre}
                          room_id={room.room_id}
                          payload={payload}
                          listView={true}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredRooms.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)]">
                No stories in this genre yet.
              </div>
            )}

            <div className="mt-12 mb-16 text-center">
              <CreateRoom getRoomsFromDb={getRoomsFromDb} />
            </div>
          </>
        ) : (
          <div className="min-h-[40vh] flex justify-center items-center">
            <div className="spinner" role="status" aria-label="Loading stories" />
          </div>
        )}
      </div>
    </>
  );
};

export default Rooms;
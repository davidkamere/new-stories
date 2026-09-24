"use client"

import { useState } from "react";

import { createNewRoom } from "@/utils/db/actions";
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
    transform: 'translate(-50%, -50%)',
    background: 'transparent',
    border: 'none',
    padding: 0,
    zIndex: 61,
    width: '90%',
    maxWidth: '32rem',
    maxHeight: '90vh',
    overflow: 'auto',
  },
};

type CreateRoomProps = {
  getRoomsFromDb: () => void;
};

const CreateRoom = (props: CreateRoomProps) => {
  const { getRoomsFromDb } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("");
  const [penName, setPenName] = useState("");
  const [isAdultThemeSelected, setIsAdultThemeSelected] = useState(false);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAdultThemeSelected(event.target.checked);
  };

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTitle("");
    setContent("");
    setGenre("");
    setPenName("");
    setIsAdultThemeSelected(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createNewRoom(title, content, genre);
    const roomId = created?.[0]?.room_id;
    if (penName && roomId) {
      localStorage.setItem(`penname:${roomId}`, penName);
    }
    getRoomsFromDb();
    closeModal();
  };

  return (
    <div>
      <Modal
        isOpen={isOpen}
        style={modalStyles}
        onRequestClose={closeModal}
        contentLabel="Create new story"
      >
        <form onSubmit={handleSubmit} className="sheet max-h-[85vh] overflow-y-auto">
          <div className="sheet-header">
            <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-muted)]">New Story</p>
            <h2 className="ink-title text-2xl mt-1">Start a story</h2>
            <p className="text-small text-[var(--text-muted)] mt-1">
              Pick a pen name, a title, and a genre. Your first lines set the tone.
            </p>
          </div>
          <div className="sheet-content space-y-5">
            <div>
              <label htmlFor="penName" className="text-small text-[var(--text-muted)] block mb-1.5">
                Your pen name
              </label>
              <input
                type="text"
                id="penName"
                placeholder="Pen name"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="title" className="text-small text-[var(--text-muted)] block mb-1.5">
                Title
              </label>
              <input
                type="text"
                id="title"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="genre" className="text-small text-[var(--text-muted)] block mb-1.5">
                Genre
              </label>
              <input
                type="text"
                id="genre"
                placeholder="Genre (e.g. Mystery, Fantasy, Literary)"
                value={genre}
                required
                onChange={(e) => setGenre(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="text-small text-[var(--text-muted)] block mb-1.5">
                Any adult themes?
              </label>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 gap-2">
                <label className="flex items-center gap-2 text-small cursor-pointer">
                  <input
                    type="radio"
                    name="adultThemes"
                    checked={isAdultThemeSelected}
                    onChange={handleCheckboxChange}
                    className="accent-[var(--accent)]"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 text-small cursor-pointer">
                  <input
                    type="radio"
                    name="adultThemes"
                    checked={!isAdultThemeSelected}
                    onChange={(event) => setIsAdultThemeSelected(!event.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="content" className="text-small text-[var(--text-muted)] block mb-1.5">
                Write something to start the story off...
              </label>
              <textarea
                rows={5}
                id="content"
                placeholder="It was the best of times, it was the worst of times..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="input min-h-[120px] resize-y font-sans"
              />
            </div>

            <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-3 border-t border-[var(--border)] mt-4">
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Start Story
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <button
        className="btn btn-primary"
        onClick={handleOpenModal}
      >
        Create New Story
      </button>
    </div>
  );
};

export default CreateRoom;
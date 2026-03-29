import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { createRoom, fetchRooms, RoomMessageRow, RoomRow } from './api';

const USERNAME_KEY = 'chat_username';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [username, setUsername] = useState<string>(() => {
    const existing = localStorage.getItem(USERNAME_KEY);
    return existing ? existing : '';
  });
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState('');

  const [typingUsers, setTypingUsers] = useState<Set<string>>(() => new Set());

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const usernameRef = useRef(username);
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const typingText = useMemo(() => {
    const names = [...typingUsers.values()].filter(Boolean);
    if (names.length === 0) return '';
    const maxNames = 3;
    const shown = names.slice(0, maxNames);
    const remaining = names.length - shown.length;
    const prefix = shown.join(', ');
    if (remaining <= 0) {
      return names.length === 1 ? `${prefix} is typing...` : `${prefix} are typing...`;
    }
    return `${prefix} +${remaining} more are typing...`;
  }, [typingUsers]);

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(USERNAME_KEY, username);
  }, [username]);

  // Fetch rooms after username is set.
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadError('');
        const list = await fetchRooms();
        if (!cancelled) setRooms(list);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load rooms');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Create socket connection once username is set.
  useEffect(() => {
    if (!username) return;
    if (socketRef.current) return;

    const s = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = s;

    s.on('room:history', (payload: { roomId: string; messages: RoomMessageRow[] }) => {
      if (!payload?.roomId) return;
      if (payload.roomId !== activeRoomIdRef.current) return;
      setTypingUsers(new Set());
      setMessages(payload.messages ?? []);
    });

    s.on('message', (payload: RoomMessageRow) => {
      const { roomId, id } = payload ?? {};
      if (!roomId || !id) return;
      if (roomId !== activeRoomIdRef.current) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === id)) return prev;
        return [...prev, payload];
      });
    });

    s.on('typing', (payload: { roomId: string; username: string; isTyping: boolean }) => {
      if (!payload?.roomId) return;
      if (payload.roomId !== activeRoomIdRef.current) return;
      if (payload.username === usernameRef.current) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (payload.isTyping) next.add(payload.username);
        else next.delete(payload.username);
        return next;
      });
    });

    const rejoin = () => {
      const roomId = activeRoomIdRef.current;
      const u = usernameRef.current;
      if (!roomId || !u) return;
      s.emit('join', { roomId, username: u });
    };

    s.on('connect', rejoin);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  // Join/leave room when activeRoomId changes.
  useEffect(() => {
    const s = socketRef.current;
    const roomId = activeRoomId;
    if (!username || !s || !roomId) return;

    setTypingUsers(new Set());
    setMessages([]);

    s.emit('join', { roomId, username });

    return () => {
      if (s?.connected) {
        s.emit('typing', { roomId, isTyping: false, username });
        s.emit('join', { roomId: null, username });
      }
    };
  }, [activeRoomId, username]);

  // Auto-scroll to latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId]);

  const emitTyping = (isTyping: boolean) => {
    const s = socketRef.current;
    if (!s?.connected || !activeRoomId) return;
    s.emit('typing', { roomId: activeRoomId, isTyping, username });
  };

  // Emit typing indicator based on draft content.
  useEffect(() => {
    if (!activeRoomId) return;

    const trimmed = draft.trim();
    if (!trimmed) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTyping(false);
      }
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }

    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, 1200);

    return () => {
      // Timer is cleared/managed by the next effect run.
    };
  }, [draft, activeRoomId]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, []);

  const submitUsername = () => {
    const clean = usernameDraft.trim().slice(0, 32);
    if (!clean) {
      setUsernameError('Username is required.');
      return;
    }
    setUsernameError('');
    setUsername(clean);
  };

  const submitCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoomName.trim().slice(0, 50);
    if (!name) return;

    try {
      setLoadError('');
      const created = await createRoom(name);
      const list = await fetchRooms();
      setRooms(list);
      setActiveRoomId(created.id);
      setNewRoomName('');
      setMessages([]);
      setDraft('');
      setTypingUsers(new Set());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not create room');
    }
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !activeRoomId) return;

    socketRef.current?.connected &&
      socketRef.current.emit('message', {
        roomId: activeRoomId,
        body: text,
        username,
      });

    setDraft('');
    isTypingRef.current = false;
    emitTyping(false);
  };

  if (!username) {
    return (
      <div className="page">
        <div className="center">
          <h1>Real-time Group Chat</h1>
          <p className="muted">Pick a username to start chatting.</p>
          <label className="field">
            <span>Username</span>
            <input
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              autoComplete="nickname"
              placeholder="e.g. Alice"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitUsername();
              }}
            />
          </label>
          {usernameError && <div className="error">{usernameError}</div>}
          <button className="btn" onClick={submitUsername} type="button">
            Continue
          </button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (!activeRoomId) {
    return (
      <div className="page">
        <div className="header">
          <div className="me">Signed in as <strong>{username}</strong></div>
        </div>

        <div className="content">
          <div className="card">
            <div className="card-header">
              <h2>Rooms</h2>
              <button
                className="link-btn"
                type="button"
                onClick={() => {
                  localStorage.removeItem(USERNAME_KEY);
                  setUsername('');
                }}
              >
                Change username
              </button>
            </div>

            <form onSubmit={submitCreateRoom} className="create-form">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="New room name"
              />
              <button type="submit" className="btn" disabled={!newRoomName.trim()}>
                Create
              </button>
            </form>

            {loadError && <div className="error">{loadError}</div>}

            <ul className="room-list">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    className="room-item"
                    type="button"
                    onClick={() => {
                      setActiveRoomId(r.id);
                      setMessages([]);
                      setDraft('');
                      setTypingUsers(new Set());
                    }}
                  >
                    <span className="room-name">{r.name}</span>
                    <span className="room-meta">Room</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <button
          className="link-btn"
          type="button"
          onClick={() => {
            setActiveRoomId(null);
            setMessages([]);
            setDraft('');
            setTypingUsers(new Set());
          }}
        >
          Rooms
        </button>
        <div className="me">
          Room <strong>{rooms.find((r) => r.id === activeRoomId)?.name ?? activeRoomId}</strong>
        </div>
      </div>

      <div className="content">
        <div className="chat-wrap">
          <div className="messages" role="log" aria-live="polite">
            {typingText && <div className="typing">{typingText}</div>}
            {messages.map((m) => {
              const mine = m.username === username;
              return (
                <div key={m.id} className={`msg ${mine ? 'mine' : 'theirs'}`}>
                  <div className="meta">
                    <span className="sender">{m.username}</span>
                    <time className="time">{formatTime(m.createdAt)}</time>
                  </div>
                  <div className="body">{m.body}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="composer">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="button" className="btn" onClick={sendMessage} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.page {
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text);
}

.center {
  max-width: 520px;
  margin: 0 auto;
  padding: 5rem 1rem;
  text-align: center;
}

h1 {
  margin: 0 0 0.25rem;
}

h2 {
  margin: 0;
}

.muted {
  color: var(--text-muted);
  margin: 0.25rem 0 1.25rem;
}

.field {
  display: grid;
  gap: 0.35rem;
  text-align: left;
  margin: 0 auto;
  max-width: 360px;
}

.field span {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.field input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
}

.field input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn {
  background: var(--accent);
  color: #fff;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  margin-top: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: #ff8a98;
  margin-top: 0.75rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.me {
  color: var(--text-muted);
}

.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem;
}

.card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.link-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--accent);
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
}

.create-form {
  display: flex;
  gap: 0.5rem;
}

.create-form input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.85rem;
  color: var(--text);
}

.room-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.5rem;
}

.room-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
}

.room-item:hover {
  border-color: var(--text-muted);
}

.room-name {
  font-weight: 700;
}

.room-meta {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.chat-wrap {
  height: calc(100vh - 72px);
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 0.75rem;
}

.messages {
  background: var(--bg-chat);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.typing {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.msg {
  max-width: 75%;
}

.msg.mine {
  align-self: flex-end;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.15rem;
}

.sender {
  color: var(--accent);
  font-weight: 700;
  font-size: 0.85rem;
}

.time {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.body {
  white-space: pre-wrap;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
}

.msg.mine .body {
  background: rgba(0, 168, 132, 0.18);
  border-color: rgba(0, 168, 132, 0.25);
}

.composer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: var(--bg-header);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.6rem;
}

.composer input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
}

@media (max-width: 640px) {
  .header {
    padding: 0.75rem 0.9rem;
    gap: 0.5rem;
  }

  .content {
    padding: 0.9rem;
  }

  .card {
    padding: 0.85rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .create-form {
    flex-direction: column;
  }

  .create-form input {
    width: 100%;
  }

  .chat-wrap {
    height: calc(100vh - 64px);
    gap: 0.6rem;
  }

  .messages {
    padding: 0.85rem;
  }

  .msg {
    max-width: 100%;
  }

  .meta {
    gap: 0.75rem;
  }

  .composer {
    flex-direction: column;
    align-items: stretch;
  }

  .composer input {
    width: 100%;
  }

  .btn {
    width: 100%;
  }
}
`;

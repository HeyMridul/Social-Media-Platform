import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import db from './db.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

/** In-memory rooms (assignment) */
const rooms = new Map();

function sanitizeText(value, { maxLen = 4000 } = {}) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function sanitizeUsername(value) {
  return sanitizeText(value, { maxLen: 32 }) || 'Anonymous';
}

app.post('/api/rooms', (req, res) => {
  const name = sanitizeText(req.body?.name, { maxLen: 50 });
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuid();
  const now = Date.now();
  rooms.set(id, { id, name, createdAt: now, messages: [] });
  res.json({ id, name });
});

app.get('/api/rooms', (_req, res) => {
  const list = [...rooms.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => ({ id: r.id, name: r.name }));
  res.json(list);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body || {};
  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'username, password, displayName required' });
  }
  const id = uuid();
  const now = Date.now();
  try {
    const passwordHash = await hashPassword(password);
    db.prepare(
      `INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, username.trim().toLowerCase(), passwordHash, displayName.trim(), now);
    const token = signToken(id);
    res.json({
      token,
      user: { id, username: username.trim().toLowerCase(), displayName: displayName.trim() },
    });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Username taken' });
    }
    throw e;
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const row = db
    .prepare(`SELECT id, username, password_hash, display_name FROM users WHERE username = ?`)
    .get(username.trim().toLowerCase());
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(row.id);
  res.json({
    token,
    user: { id: row.id, username: row.username, displayName: row.display_name },
  });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const row = db
    .prepare(`SELECT id, username, display_name FROM users WHERE id = ?`)
    .get(req.userId);
  if (!row) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ id: row.id, username: row.username, displayName: row.display_name });
});

app.get('/api/users', authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, username, display_name FROM users WHERE id != ? ORDER BY display_name COLLATE NOCASE`
    )
    .all(req.userId);
  res.json(rows.map((r) => ({ id: r.id, username: r.username, displayName: r.display_name })));
});

function memberOfConv(conversationId, userId) {
  const m = db
    .prepare(
      `SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?`
    )
    .get(conversationId, userId);
  return !!m;
}

app.get('/api/conversations', authMiddleware, (req, res) => {
  const convs = db
    .prepare(
      `
    SELECT c.id, c.type, c.name, c.created_at
    FROM conversations c
    INNER JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
    ORDER BY c.created_at DESC
  `
    )
    .all(req.userId);

  const getMembers = db.prepare(`
    SELECT u.id, u.username, u.display_name
    FROM conversation_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ?
    ORDER BY u.display_name COLLATE NOCASE
  `);

  const getLastMsg = db.prepare(`
    SELECT body, created_at, user_id FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC LIMIT 1
  `);

  const result = convs.map((c) => {
    const members = getMembers.all(c.id);
    const last = getLastMsg.get(c.id);
    let title = c.name;
    if (c.type === 'dm') {
      const other = members.find((m) => m.id !== req.userId);
      title = other ? other.display_name : 'Direct';
    }
    return {
      id: c.id,
      type: c.type,
      name: c.name,
      title,
      memberCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        username: m.username,
        displayName: m.display_name,
      })),
      lastMessage: last
        ? { body: last.body, createdAt: last.created_at, userId: last.user_id }
        : null,
    };
  });

  res.json(result);
});

/** Find existing DM between two users or return null */
function findDmConversation(userA, userB) {
  const rows = db
    .prepare(
      `
    SELECT c.id FROM conversations c
    WHERE c.type = 'dm'
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = ?)
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.user_id = ?)
  `
    )
    .all(userA, userB);
  for (const r of rows) {
    const count = db
      .prepare(`SELECT COUNT(*) as n FROM conversation_members WHERE conversation_id = ?`)
      .get(r.id);
    if (count.n === 2) return r.id;
  }
  return null;
}

app.post('/api/conversations/dm', authMiddleware, (req, res) => {
  const { otherUserId } = req.body || {};
  if (!otherUserId || otherUserId === req.userId) {
    return res.status(400).json({ error: 'otherUserId required' });
  }
  const other = db.prepare(`SELECT id FROM users WHERE id = ?`).get(otherUserId);
  if (!other) return res.status(404).json({ error: 'User not found' });

  const existing = findDmConversation(req.userId, otherUserId);
  if (existing) {
    return res.json({ id: existing });
  }

  const convId = uuid();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO conversations (id, type, name, created_by, created_at) VALUES (?, 'dm', NULL, ?, ?)`
    ).run(convId, req.userId, now);
    db.prepare(
      `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`
    ).run(convId, req.userId, now);
    db.prepare(
      `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`
    ).run(convId, otherUserId, now);
  });
  tx();
  res.json({ id: convId });
});

app.post('/api/conversations/group', authMiddleware, (req, res) => {
  const { name, memberIds } = req.body || {};
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name required' });
  }
  const ids = [...new Set([...(memberIds || []), req.userId])];
  if (ids.length < 2) {
    return res.status(400).json({ error: 'Add at least one other member' });
  }
  for (const uid of ids) {
    const u = db.prepare(`SELECT id FROM users WHERE id = ?`).get(uid);
    if (!u) return res.status(404).json({ error: `User ${uid} not found` });
  }

  const convId = uuid();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO conversations (id, type, name, created_by, created_at) VALUES (?, 'group', ?, ?, ?)`
    ).run(convId, name.trim(), req.userId, now);
    for (const uid of ids) {
      db.prepare(
        `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`
      ).run(convId, uid, now);
    }
  });
  tx();
  res.json({ id: convId });
});

app.get('/api/conversations/:id/messages', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!memberOfConv(id, req.userId)) {
    return res.status(403).json({ error: 'Not a member' });
  }
  const rows = db
    .prepare(
      `
    SELECT m.id, m.body, m.created_at, m.user_id, u.display_name
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
    LIMIT 500
  `
    )
    .all(id);

  res.json(
    rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      userId: r.user_id,
      displayName: r.display_name,
    }))
  );
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const userId = verifyToken(token);
    if (userId) socket.userId = userId;
  }
  // Rooms chat is allowed without JWT; conversation chat requires JWT.
  socket.userId = socket.userId ?? null;
  next();
});

io.on('connection', (socket) => {
  socket.on('join', ({ conversationId }) => {
    if (!conversationId || !socket.userId || !memberOfConv(conversationId, socket.userId)) return;
    socket.join(`conv:${conversationId}`);
  });

  socket.on('leave', ({ conversationId }) => {
    if (conversationId) socket.leave(`conv:${conversationId}`);
  });

  socket.on('message', ({ conversationId, body }) => {
    if (!conversationId || !socket.userId || !body?.trim()) return;
    if (!memberOfConv(conversationId, socket.userId)) return;

    const msgId = uuid();
    const now = Date.now();
    const trimmed = body.trim().slice(0, 8000);

    db.prepare(
      `INSERT INTO messages (id, conversation_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(msgId, conversationId, socket.userId, trimmed, now);

    const user = db
      .prepare(`SELECT display_name FROM users WHERE id = ?`)
      .get(socket.userId);

    const payload = {
      id: msgId,
      conversationId,
      body: trimmed,
      createdAt: now,
      userId: socket.userId,
      displayName: user?.display_name || 'Unknown',
    };

    io.to(`conv:${conversationId}`).emit('message', payload);
  });

  // ----- Assignment: Rooms chat (in-memory) -----
  socket.on('join', ({ roomId, username }) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const cleanUsername = sanitizeUsername(username);

    socket.data.rooms = socket.data.rooms ?? {};
    socket.data.rooms[roomId] = cleanUsername;

    socket.join(`room:${roomId}`);
    socket.emit('room:history', { roomId, messages: room.messages });
  });

  socket.on('message', ({ roomId, body, username }) => {
    if (!roomId || !body?.trim()) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const cleanUsername = sanitizeUsername(username ?? socket.data.rooms?.[roomId]);
    const msgId = uuid();
    const now = Date.now();
    const trimmed = body.trim().slice(0, 8000);

    const payload = {
      id: msgId,
      roomId,
      body: trimmed,
      createdAt: now,
      username: cleanUsername,
    };

    room.messages.push(payload);
    if (room.messages.length > 500) room.messages.shift();

    io.to(`room:${roomId}`).emit('message', payload);
  });

  socket.on('typing', ({ roomId, isTyping, username }) => {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const cleanUsername = sanitizeUsername(username ?? socket.data.rooms?.[roomId]);
    socket.to(`room:${roomId}`).emit('typing', {
      roomId,
      username: cleanUsername,
      isTyping: !!isTyping,
    });
  });
});

const __dirname = dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === 'production') {
  const webDist = join(__dirname, '..', 'web', 'dist');
  app.use(express.static(webDist));
  app.get(/^(?!\/api\/)(?!\/socket\.io).*/, (_req, res) => {
    res.sendFile(join(webDist, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`Chat server http://localhost:${PORT}`);
});

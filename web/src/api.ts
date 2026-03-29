const TOKEN_KEY = 'chat_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const token = options.token ?? getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  return data as T;
}

export type User = { id: string; username: string; displayName: string };

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<{ token: string; user: User }> {
  return req('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
    token: null,
  });
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  return req('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    token: null,
  });
}

export async function fetchMe(): Promise<User> {
  return req('/api/me');
}

export async function fetchUsers(): Promise<User[]> {
  return req('/api/users');
}

export type ConversationRow = {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  title: string;
  memberCount: number;
  members: User[];
  lastMessage: { body: string; createdAt: number; userId: string } | null;
};

export async function fetchConversations(): Promise<ConversationRow[]> {
  return req('/api/conversations');
}

export async function createDm(otherUserId: string): Promise<{ id: string }> {
  return req('/api/conversations/dm', {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });
}

export async function createGroup(name: string, memberIds: string[]): Promise<{ id: string }> {
  return req('/api/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
}

export type MessageRow = {
  id: string;
  body: string;
  createdAt: number;
  userId: string;
  displayName: string;
};

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  return req(`/api/conversations/${conversationId}/messages`);
}

// ----- Assignment: Rooms API -----
export type RoomRow = { id: string; name: string };

export type RoomMessageRow = {
  id: string;
  roomId: string;
  body: string;
  createdAt: number;
  username: string;
};

export async function fetchRooms(): Promise<RoomRow[]> {
  const res = await fetch('/api/rooms');
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data as RoomRow[];
}

export async function createRoom(name: string): Promise<RoomRow> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data as RoomRow;
}

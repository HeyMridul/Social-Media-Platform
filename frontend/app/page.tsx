'use client';

import { useEffect, useState } from 'react';

type Post = { _id: string; content: string; likes: string[] };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export default function HomePage() {
  const [email, setEmail] = useState('demo@example.com');
  const [username, setUsername] = useState('demo_user');
  const [password, setPassword] = useState('password123');
  const [token, setToken] = useState('');
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  async function loadPosts() {
    const res = await fetch(`${API_BASE}/posts`);
    if (res.ok) setPosts(await res.json());
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  async function register() {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();
    if (data.accessToken) setToken(data.accessToken);
  }

  async function login() {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.accessToken) setToken(data.accessToken);
  }

  async function createPost() {
    if (!token || !content.trim()) return;
    await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    setContent('');
    await loadPosts();
  }

  return (
    <main className="container">
      <h1>Social Media App</h1>
      <div className="card">
        <h2>Auth</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <button onClick={register}>Register</button>
        <button onClick={login}>Login</button>
      </div>

      <div className="card">
        <h2>Create Post</h2>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
        <button onClick={createPost} disabled={!token}>
          Publish
        </button>
      </div>

      <div className="card">
        <h2>Feed</h2>
        {posts.map((post) => (
          <div key={post._id} className="card">
            <p>{post.content}</p>
            <small>{post.likes.length} likes</small>
          </div>
        ))}
      </div>
    </main>
  );
}

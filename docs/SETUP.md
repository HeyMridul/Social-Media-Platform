# Setup Guide

This guide covers local development setup for this monorepo.

## Prerequisites

- Node.js >= 18.x
- Docker and Docker Compose
- MongoDB (local or Atlas)
- Redis (local or managed)

## 1) Clone Repository

```bash
git clone https://github.com/yourusername/social-media-app
cd social-media-app
```

## 2) Environment Variables

### Backend `.env`

```env
# Application
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/social_media
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:3001
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## 3) Installation

### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Option B: Manual Installation

Backend:

```bash
cd backend
npm install
npm run build
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Testing

After startup:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Nginx: `http://localhost`

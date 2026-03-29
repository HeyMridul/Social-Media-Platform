# Architecture

## High-Level Topology

```text
┌─────────────┐
│   Nginx     │ ← Load Balancer
│ (Port 80)   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼───┐ ┌─▼────┐
│ App  │ │ App  │ ← NestJS Instances
│ :3001│ │ :3002│
└──┬───┘ └─┬────┘
   │       │
   └───┬───┘
       │
   ┌───┴────────────┐
   │                │
┌──▼─────┐    ┌────▼───┐
│ Redis  │    │MongoDB │
│ :6379  │    │ :27017 │
└────────┘    └────────┘
```

## Backend Structure (NestJS)

```text
src/
├── auth/
├── users/
├── posts/
├── notifications/
├── cache/
├── queue/
├── common/
├── config/
├── health/
├── app.module.ts
└── main.ts
```

## Frontend Structure (Next.js)

```text
src/
├── app/
│   ├── (auth)/
│   └── (dashboard)/
├── components/
├── context/
├── hooks/
├── services/
├── lib/
├── types/
└── middleware.ts
```

## Real-Time Notification Flow

1. User A follows User B.
2. Backend validates and persists the action.
3. Redis cache updates follower-related counters/data.
4. WebSocket event emits to User B active sockets.
5. Notification job enqueues for optional email delivery.
6. Frontend displays live toast and refreshes notifications query.

## Redis Usage

- Session storage and token invalidation
- API response and hot-key caching
- Rate-limiter counters
- Socket.IO adapter for multi-instance pub/sub
- Bull queue backend

## Rate Limiting Strategy

- Global throttling for baseline abuse prevention
- Endpoint-specific limits for sensitive routes (`/login`, `/register`)
- Supports both IP and user-centric enforcement

## Socket.IO Horizontal Scaling

Use Redis adapter so events propagate across backend instances:

```ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
```

This ensures notification and room events remain consistent in multi-node deployments.

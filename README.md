# Social Media App

Full-stack social media app scaffold using Next.js + NestJS + MongoDB + Redis, with Docker and Nginx setup for local production-like development.

## Documentation Index

- Setup and environment: `docs/SETUP.md`
- Architecture and scaling: `docs/ARCHITECTURE.md`
- Deployment and CI/CD: `docs/DEPLOYMENT.md`
- Operations, monitoring, and security: `docs/OPERATIONS.md`

## Monorepo Structure

- `backend/` - NestJS API (auth, users/follow, posts/feed, health)
- `frontend/` - Next.js App Router client (register/login/create post/feed)
- `infra/nginx/` - reverse proxy and load balancer config
- `docker-compose.yml` - local multi-service orchestration

## Implemented Today

- JWT auth endpoints: `POST /auth/register`, `POST /auth/login`
- Profile endpoint: `GET /users/me`
- Follow endpoint: `POST /users/follow`
- Posts endpoints: `GET /posts`, `POST /posts`, `POST /posts/like`
- MongoDB models with indexes for users and posts
- Security and platform baseline: Helmet, CORS, validation pipe, throttling
- Docker Compose stack for MongoDB, Redis, backend, frontend, and Nginx

## Tech Stack

### Frontend

- Next.js 14 (App Router)
- React Context API
- Socket.IO Client
- Tailwind CSS
- React Query
- Zod

### Backend

- NestJS
- MongoDB + Mongoose
- Redis
- Socket.IO
- Bull Queue
- Passport JWT
- Helmet
- Express Rate Limit

### Infrastructure and DevOps

- Docker
- Docker Compose
- Nginx
- PM2
- GitHub Actions

## Quick Start

See `docs/SETUP.md` for full setup steps (Docker and manual install).

## License

This project is licensed under the MIT License.

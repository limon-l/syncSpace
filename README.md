# SyncSpace

> Real-time video conferencing and collaborative workspace — video calls, live chat, shared notes, and file sharing in one place.

SyncSpace is a full-stack, real-time collaboration platform. The **backend** is a Fastify 5 + Socket.IO API with MongoDB and Yjs-powered collaborative editing; the **frontend** is a Next.js 15 (App Router) application using LiveKit for WebRTC video and Zustand for state.

---

## ✨ Features

- **Video Conferencing** — Low-latency WebRTC via LiveKit SFU, with screen sharing, active-speaker detection, and host mute/remove controls.
- **Real-time Chat** — In-meeting messaging over Socket.IO, with reactions and emoji support.
- **Collaborative Notes** — Multi-cursor, conflict-free rich text editor powered by Yjs and `y-websocket`.
- **File Sharing** — Drag-and-drop uploads broadcast to all participants in real time.
- **Meeting Management** — Create, schedule, lock, and end meetings with host/co-host controls.
- **Authentication** — Email/password with email verification, password reset, and secure session cookies.
- **Security** — Helmet (security headers), rate limiting, NoSQL-injection prevention, HttpOnly cookies, and Zod input validation.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :---- | :---------- |
| Backend | Fastify 5, Mongoose 8, Socket.IO 4, Yjs, TypeScript |
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Zustand 5, Motion |
| Video | LiveKit (SFU WebRTC) |
| Collaboration | Yjs, y-websocket, y-protocols |
| Validation | Zod |
| Tests | Vitest |
| Build / Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (web) + Render (API) / Docker |

---

## 📁 Monorepo Structure

```
syncspace/
├── apps/
│   ├── api/          Fastify 5 + Mongoose + Socket.IO + Yjs collab
│   └── web/          Next.js 15 App Router + LiveKit + Zustand
├── packages/
│   ├── config/       Shared TypeScript configs
│   ├── types/        Shared TypeScript interfaces
│   └── validation/   Zod schemas (+ unit tests)
├── docker/           Dockerfiles and docker-compose
├── render.yaml        Render blueprint (API)
└── turbo.json        Turborepo pipeline
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10

  ```bash
  corepack enable && corepack prepare pnpm@10.7.0 --activate
  ```

- **MongoDB** >= 7 (local instance or [MongoDB Atlas](https://mongodb.com/atlas))

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the backend environment
cp apps/api/.env.example apps/api/.env
#    Then edit apps/api/.env and set MONGODB_URI, SESSION_SECRET, etc.

# 3. (Optional) Configure the frontend environment
cp apps/web/.env.example apps/web/.env.local

# 4. Start all dev servers (API :4000, Web :3000)
pnpm dev
```

The API runs at `http://localhost:4000` and the web app at `http://localhost:3000`.
In local development, Next.js automatically proxies `/api`, `/socket.io`, and `/collab` to the API (see `apps/web/next.config.ts`).

---

## 🔧 Environment Variables

### Backend (`apps/api/.env`)

| Variable | Required | Default | Description |
| :------- | :------: | :------ | :---------- |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `SESSION_SECRET` | Yes | — | 64+ char hex string for session signing (`openssl rand -hex 64`) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowed origins (must include the frontend URL) |
| `APP_URL` | No | `http://localhost:3000` | Public frontend URL (used in verification/reset emails) |
| `SMTP_HOST` | Yes* | — | SMTP server (free: [Brevo](https://brevo.com), 300 emails/day) |
| `SMTP_PORT` | Yes* | `587` | SMTP port |
| `SMTP_USER` | Yes* | — | SMTP username |
| `SMTP_PASS` | Yes* | — | SMTP password / key |
| `LIVEKIT_API_KEY` | No | — | LiveKit API key (video calls) |
| `LIVEKIT_API_SECRET` | No | — | LiveKit API secret |
| `LIVEKIT_URL` | No | — | LiveKit WebSocket URL |

\* Only required if you want email sending (verification / password reset).

### Frontend (`apps/web/.env.local`)

| Variable | Description |
| :------- | :---------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API (e.g. Render URL). Leave empty locally to use the built-in proxy. |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL (same as API URL) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit WebSocket URL (`wss://…`) |
| `NEXT_PUBLIC_COLLAB_URL` | Yjs collab WebSocket URL (API URL + `/collab`) |

> **Note:** `NEXT_PUBLIC_*` variables are inlined at build time. They must be set **before** building/deploying the frontend.

---

## 📋 API Endpoints

| Method | Path | Auth | Description |
| :----- | :--- | :--: | :---------- |
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | Yes | Log out |
| GET | `/api/auth/session` | Yes | Get the current session |
| POST | `/api/auth/refresh` | Yes | Refresh the session |
| GET | `/api/auth/verify-email/:token` | No | Verify email address |
| POST | `/api/auth/forgot-password` | No | Request a password reset |
| POST | `/api/auth/reset-password/:token` | No | Reset password |
| GET | `/api/meetings` | Yes | List user meetings |
| POST | `/api/meetings` | Yes | Create a meeting |
| GET | `/api/meetings/history` | Yes | List the user's past/active meetings |
| GET | `/api/meetings/:roomCode` | Yes | Get meeting details |
| POST | `/api/meetings/:roomCode/join` | Yes | Join a meeting |
| POST | `/api/meetings/:roomCode/end` | Yes | End a meeting (host only) |
| POST | `/api/meetings/:roomCode/lock` | Yes | Lock/unlock a meeting (host) |
| GET | `/api/meetings/:roomCode/messages` | Yes | Get chat messages |
| POST | `/api/meetings/:roomCode/files` | Yes | Upload a file |
| GET | `/api/meetings/:roomCode/files` | Yes | List files |
| GET | `/api/meetings/:roomCode/files/:fileId` | Yes | Download a file |
| DELETE | `/api/meetings/:roomCode/files/:fileId` | Yes | Delete a file |
| GET | `/api/users/me` | Yes | Get the current user profile |
| PATCH | `/api/users/me` | Yes | Update the user profile |
| GET | `/api/users/search` | Yes | Search users |
| GET | `/api/livekit/token/:roomName` | Yes | Get a LiveKit access token |
| GET | `/api/health` | No | Health check |

---

## 📜 Scripts

| Command | Description |
| :------ | :---------- |
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm clean` | Clean build artifacts |

---

## ☁️ Deployment

This project is designed to run with the **frontend on [Vercel](https://vercel.com)**
and the **backend (API) on [Render](https://render.com)**.

### 1. Backend — Render

A `render.yaml` blueprint is included. The fastest path:

1. In Render, **New → Blueprint** and select this repo. Render will pick up `render.yaml`.
2. Set the following **Environment Variables** (marked `sync: false` in the blueprint, so add them in the dashboard):

   | Key | Value |
   | :-- | :----- |
   | `MONGODB_URI` | Your MongoDB Atlas connection string |
   | `SESSION_SECRET` | `openssl rand -hex 64` |
   | `CORS_ORIGIN` | Your Vercel frontend URL, e.g. `https://syncspace.vercel.app` |
   | `APP_URL` | Your Vercel frontend URL (used in email links) |
   | `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` | Your LiveKit credentials |
   | `SMTP_*` | (Optional) Brevo SMTP credentials |

3. Render builds with `pnpm install && npx turbo build --filter=@syncspace/api`
   and starts `node apps/api/dist/app.js`. The health check is `GET /api/health`.

> **Cross-origin cookies:** in production the session cookie is issued with
> `SameSite=None; Secure`, so the API must list the Vercel origin in `CORS_ORIGIN`.
> Without this, login works but authenticated API calls / Socket.IO will fail.

### 2. Frontend — Vercel

1. **Import** the repo into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Build Command** to:

   ```bash
   pnpm build
   ```

   (`pnpm build` runs a `prebuild` that builds the workspace type packages,
   then `next build`.)
4. **Install Command** can stay as `pnpm install`.
5. Add these **Environment Variables** (build-time, required):

   | Key | Value |
   | :-- | :----- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-api-url>` |
   | `NEXT_PUBLIC_SOCKET_URL` | `https://<your-render-api-url>` |
   | `NEXT_PUBLIC_LIVEKIT_URL` | `wss://<your-livekit-url>` |
   | `NEXT_PUBLIC_COLLAB_URL` | `wss://<your-render-api-url>/collab` |

> When `NEXT_PUBLIC_API_URL` is set, the frontend calls the API directly
> (no proxy). In local dev (value empty) the Next.js rewrites in
> `apps/web/next.config.ts` proxy `/api`, `/socket.io`, and `/collab` to `localhost:4000`.

### 3. LiveKit

Sign up at [livekit.io](https://livekit.io) (free tier: 50 peak connections) or self-host
following the [LiveKit server guide](https://docs.livekit.io/server/self-hosted/).
Provide `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` to the backend,
and `NEXT_PUBLIC_LIVEKIT_URL` to the frontend.

---

## 🐳 Docker (Alternative)

A `docker-compose.yml` is provided for a fully local, containerized stack
(API + Web + MongoDB):

```bash
docker compose -f docker/docker-compose.yml up --build
```

This starts MongoDB 7, the API, and the web app.

---

## ⚠️ Known Limitations

- **File & collab storage is local disk** (`./uploads` and `./data/ydocs`).
  On Render these are **ephemeral** (reset on deploy) and not shared across instances.
  For production, persist uploads to object storage (e.g. S3) and Yjs docs to durable storage.
- The free Render web service sleeps after inactivity; the first request may be slow.

---

## ✅ Project Status

All core phases are complete:

- [x] Monorepo foundation, shared types, Zod validation
- [x] Fastify API + Next.js frontend
- [x] Auth, meetings, Socket.IO real-time events
- [x] LiveKit video conferencing
- [x] Yjs collaborative editor
- [x] File sharing
- [x] Security hardening (Helmet, rate limiting, sanitization)
- [x] Tests (Vitest)
- [x] Docker + Render deployment

---

## 📄 License

This project is provided as-is for learning and demonstration purposes.

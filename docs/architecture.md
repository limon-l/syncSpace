# SyncSpace — System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Clients (Browser)                          │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │   Next.js App (Web)  │  │   Next.js App (WebRTC Media)       │   │
│  │   - React Components │  │   - LiveKit Client SDK             │   │
│  │   - Zustand (state)  │  │   - RTCPeerConnection (via SFU)    │   │
│  │   - Socket.IO Client │  │   - MediaStream (cam/mic/screen)   │   │
│  │   - TanStack Query   │  │                                    │   │
│  └──────────┬───────────┘  └──────────────┬─────────────────────┘   │
│             │                              │                         │
└─────────────┼──────────────────────────────┼─────────────────────────┘
              │                              │
              │  HTTPS / WSS                 │  WebRTC (SRTP/SCTP)
              │                              │
┌─────────────┼──────────────────────────────┼─────────────────────────┐
│             │                  ┌───────────▼─────────────┐           │
│             │                  │   LiveKit Server (SFU)  │           │
│             │                  │   - Media routing       │           │
│             │                  │   - Simulcast           │           │
│             │                  │   - Selective forwarding │           │
│             │                  │   - TURN relay          │           │
│             │                  └───────────┬─────────────┘           │
│             │                              │                         │
│  ┌──────────▼──────────────────────────────────────────────────┐    │
│  │                    Reverse Proxy (nginx/Caddy)               │    │
│  │                    /api/* → Fastify                          │    │
│  │                    /socket.io/* → Socket.IO Server           │    │
│  │                    /* → Next.js                              │    │
│  └──────────┬──────────────────────────────────────────────────┘    │
│             │                              │                         │
│  ┌──────────▼──────────┐    ┌──────────────▼──────────────┐         │
│  │   Fastify API       │    │   Socket.IO Server          │         │
│  │   - Auth            │    │   - Room management         │         │
│  │   - Meeting CRUD    │    │   - Presence                │         │
│  │   - User management │    │   - Chat                    │         │
│  │   - Invitations     │    │   - Reactions               │         │
│  │   - File metadata   │    │   - Host actions             │         │
│  │   - Audit logging   │    │   - Whiteboard signaling     │         │
│  └──────────┬──────────┘    └──────────────┬──────────────┘         │
│             │                              │                         │
│  ┌──────────▼──────────────────────────────▼──────────────┐         │
│  │                    Shared Infrastructure                │         │
│  │                                                         │         │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │         │
│  │  │   MongoDB    │  │    Redis     │  │  S3 Storage  │  │         │
│  │  │ (Persistent) │  │ (Cache/Pub)  │  │ (Files)      │  │         │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │         │
│  └─────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Technology Decisions

### Express vs Fastify

| Criteria | Express | Fastify |
|----------|---------|---------|
| Throughput | ~20k req/s | ~50k req/s |
| JSON Schema validation | Manual (Joi/Zod) | Built-in via JSON Schema |
| TypeScript support | Good | Excellent (types inferred from schemas) |
| Plugin system | Middleware only | Encapsulated plugins with scope |
| Performance overhead | Higher | Minimal |
| Logging | Morgan | Pino (Fastify default, fastest logger) |
| Community size | Largest | Large, growing |
| WebSocket integration | via `express-ws` | via `@fastify/websocket` |

**Decision: Fastify.** For a real-time platform handling concurrent Socket.IO connections, WebRTC signaling, and many simultaneous API requests, Fastify's performance advantage is meaningful. Its schema-based validation, encapsulated plugin system for modular architecture, and built-in Pino logging map directly to project requirements.

### Monorepo Tooling

**Decision: pnpm workspaces + Turborepo.** pnpm provides strict dependency isolation (no phantom dependencies), disk-efficient storage via content-addressable linking, and native workspace protocol. Turborepo adds parallel task execution, caching, dependency graph awareness, and remote caching. Minimal configuration compared to Nx.

### Authentication Library

**Decision: Custom implementation with Fastify.** Instead of wrapping an auth library (Better Auth, Auth.js), we implement authentication directly with Fastify plugins. This:
- Demonstrates deep understanding of session management, password hashing, token rotation
- Avoids dependency on library internals that may not fit SFU + Socket.IO architecture
- Allows precise control over session format, cookie configuration, and refresh strategy
- Avoids unnecessary abstractions for what is fundamentally: password → hash → session → cookie

### SFU Platform

**Decision: LiveKit.** LiveKit provides:
- Production-grade SFU with simulcast, adaptive streaming, selective subscription
- Built-in TURN relay
- SDK for React (`@livekit/components-react`) and Node.js
- Webhook integration for room events
- Active open-source development
- Self-hostable or cloud-hosted

Alternative considered: mediasoup (lower-level, more control, more operational complexity).

### Collaborative State (Post-MVP)

**Decision: Yjs + y-websocket.** Yjs provides CRDT-based synchronization with awareness protocol. Used for whiteboard and collaborative notes. Server runs `y-websocket` for document persistence and state broadcasting.

### File Storage (Post-MVP)

**Decision: S3-compatible object storage.** AWS S3 or MinIO (self-hosted). Files stored with generated keys. Signed URLs for access. Database stores metadata only.

## 3. Frontend Architecture

### Route Design

```
/                                   → Landing page (public)
/auth/login                         → Login
/auth/register                      → Register
/auth/verify-email                  → Email verification
/auth/forgot-password               → Forgot password
/auth/reset-password                → Reset password
/dashboard                          → Dashboard (protected)
/dashboard/meeting-history          → Past meetings
/meeting/prejoin/[roomId]           → Pre-join device check
/meeting/room/[roomId]              → Active meeting room
```

### Component Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── (marketing)/        # Landing page route group
│   ├── (auth)/             # Auth pages route group
│   ├── (dashboard)/        # Dashboard route group (protected)
│   └── meeting/            # Meeting routes (protected)
├── components/
│   ├── ui/                 # Shared UI primitives (shadcn/ui)
│   ├── layout/             # App shell, nav, sidebar
│   └── meeting/            # Meeting-specific shared components
├── features/
│   ├── auth/               # Auth feature (hooks, stores, forms)
│   ├── meeting/            # Meeting feature
│   ├── media/              # WebRTC/media feature
│   ├── chat/               # Chat feature
│   ├── participants/       # Participant management
│   └── notifications/      # Notification feature
├── lib/                    # Utilities, API client, socket client
├── stores/                 # Zustand stores (global state)
├── hooks/                  # Shared hooks
├── types/                  # Shared TypeScript types
└── config/                 # App configuration
```

### State Management Decisions

| State Type | Tool | Rationale |
|------------|------|-----------|
| Server data (meetings, history) | TanStack Query | Caching, dedup, refetch, stale-while-revalidate |
| Meeting UI state (panels, active tab) | Zustand | Ephemeral, client-only, frequent updates |
| Media state (camera/mic on/off) | Zustand + React local | Frequent updates, local-first with socket sync |
| Participant list | Zustand | Realtime updates from Socket.IO |
| Chat messages | Zustand (ephemeral) + TanStack Query (history) | Recent messages in memory, history from server |
| Auth session | Zustand + HttpOnly cookie | Server-managed session, client reflects status |
| URL state (roomId, params) | next/navigation | Shareable, back/forward compatible |
| Form state | React Hook Form + Zod | Form-specific, validated at submit |

### Server vs Client Components

- **Server Components (default)**: Landing page, dashboard overview, meeting history list, auth pages (non-interactive parts)
- **Client Components**: Meeting room, interactive panels, forms, real-time components
- `"use client"` boundary placed at the lowest interactive level, not at the page level

## 4. Backend Architecture

### Modular Structure

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/              # Registration, login, logout, verify, reset
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── user/              # Profile, settings
│   │   ├── meeting/           # CRUD, invitations, room tokens
│   │   ├── chat/              # Message persistence
│   │   ├── notification/      # Notification management
│   │   └── audit/             # Audit log queries
│   ├── plugins/
│   │   ├── auth.plugin.ts     # Session verification, authentication hooks
│   │   ├── authorization.plugin.ts  # Role/permission verification
│   │   ├── rate-limit.plugin.ts
│   │   └── cors.plugin.ts
│   ├── socket/
│   │   ├── socket.server.ts   # Socket.IO setup, authentication
│   │   ├── handlers/
│   │   │   ├── presence.handler.ts
│   │   │   ├── chat.handler.ts
│   │   │   ├── reaction.handler.ts
│   │   │   ├── host-actions.handler.ts
│   │   │   └── media.handler.ts
│   │   └── validation/
│   │       └── event-schemas.ts
│   ├── lib/
│   │   ├── database.ts        # MongoDB connection
│   │   ├── redis.ts           # Redis client (future)
│   │   ├── logger.ts          # Pino logger
│   │   ├── errors.ts          # Custom error classes
│   │   └── config.ts          # Environment validation
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── meeting.model.ts
│   │   ├── participant-session.model.ts
│   │   ├── message.model.ts
│   │   ├── invitation.model.ts
│   │   ├── notification.model.ts
│   │   └── audit-log.model.ts
│   └── app.ts                 # Fastify app setup
```

### Plugin Architecture (Fastify Encapsulation)

Fastify plugins enable modular architecture without "one large controllers directory":

```
app.ts registers:
├── cors.plugin         → global CORS
├── auth.plugin         → decorate request with `getCurrentUser()`
├── rate-limit.plugin   → global rate limiter
├── auth module         → scoped: auth routes use auth schemas
├── meeting module      → scoped: meeting routes, preHandler: auth required
├── user module         → scoped: user routes
└── socket.server.ts    → Socket.IO attached to Fastify HTTP server
```

Each module is encapsulated: its routes, schemas, controllers, and services form a cohesive unit. A module cannot accidentally interfere with another module's routes or schemas.

## 5. Data Flow

### Meeting Join Flow

```
User clicks invite link
        │
        ▼
Next.js route: /meeting/prejoin/[roomId]
        │
        ▼
Client fetches meeting metadata: GET /api/meetings/:roomId
        │
        ▼
Fastify validates room code, returns { title, hostName, hasPassword, participantCount }
        │
        ▼
Pre-join page: device selection, display name
        │
        ▼
User clicks "Join"
        │
        ▼
Server generates signed room token: POST /api/meetings/:roomId/join
        │
        ▼
Socket.IO connects with token in handshake auth
Server validates token, joins socket room
        │
        ▼
Server broadcasts participant:joined to room
        │
        ▼
Client initializes LiveKit participant with room token
        │
        ▼
WebRTC tracks flow via LiveKit SFU
Media flows peer → SFU → peers
```

## 6. Security Architecture

### Defense Layers

```
Layer 1: Network
  - HTTPS/WSS enforced
  - CORS restricted to known origins
  - Rate limiting per IP and per user

Layer 2: Session
  - HttpOnly, Secure, SameSite=Strict cookies
  - Session token: 128-bit random, stored hashed in DB
  - Session expiry: 15 minutes, refresh token: 7 days
  - Refresh rotation: old refresh token invalidated on use

Layer 3: Request Validation
  - JSON Schema validation on every Fastify route
  - Zod validation on every Socket.IO event
  - Content-Type enforcement

Layer 4: Authorization
  - session → user → role check for every protected route
  - Socket.IO: room membership validated server-side per event
  - Host actions: check meeting.hostId === userId on every event

Layer 5: Data
  - Argon2id password hashing (mem=64MB, time=3, par=4)
  - No sensitive data in logs
  - Generated storage keys for files (not user-provided names)
  - Signed room tokens with expiration
```

### Encryption Clarification

| Layer | Method | Scope |
|-------|--------|-------|
| Transport | TLS 1.3 | All HTTP/WebSocket traffic |
| WebRTC media | DTLS-SRTP | Peer-to-peer and SFU media streams |
| Server-side | MongoDB encryption-at-rest | Database storage |
| End-to-end | Not implemented | E2EE requires key exchange outside server; not in current scope |

**This system is NOT end-to-end encrypted.** The SFU decrypts and re-encrypts media. Server has access to chat messages. Post-MVP E2EE would require significant architectural changes.

## 7. Deployment Topology (MVP)

```
┌──────────────────────────────────────┐
│         Single Server (VPS)           │
│                                       │
│  nginx (reverse proxy, SSL term)      │
│  │                                    │
│  ├── Next.js (Node, port 3000)        │
│  ├── Fastify + Socket.IO (port 4000)  │
│  └── LiveKit (port 7880)              │
│                                       │
│  MongoDB Atlas (external)             │
│  Redis (same VPS, container)          │
│  S3 (external, future)               │
└──────────────────────────────────────┘
```

Scaling strategy: Socket.IO + Redis adapter horizontally, LiveKit auto-scaling nodes, API behind load balancer. Documented but not implemented in MVP.

## 8. Key Architectural Rules

1. **Fastify API never serves pages.** Next.js handles all rendering. API provides JSON only.
2. **Socket.IO never stores data.** It broadcasts events. Persistence goes through API (HTTP).
3. **Chat messages are persisted via HTTP.** Socket.IO delivers them in real-time. On reconnect, client fetches history via API.
4. **Media never enters the API server.** Media flows directly between browser and LiveKit SFU.
5. **Room tokens are required for LiveKit access.** Generated server-side with expiration. No direct room access without token.
6. **Every Socket.IO event is validated with Zod** before processing.
7. **Socket.IO room membership is not trustable alone.** Permissions are checked against database for every sensitive action.
8. **Logout revokes all sessions.** Refresh tokens invalidated server-side.

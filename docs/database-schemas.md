# SyncSpace — Database Schemas & Contracts

## 1. Schema Design Principles

- **MongoDB collections** for each aggregate root (User, Meeting, Message, etc.)
- **Embedded documents** only for strictly coupled, bounded data (e.g., refresh tokens within User)
- **References** for relationships between aggregates (e.g., meetingId on Message, not embedded messages array)
- **Indexes** for every query pattern — no collection scans in production
- **TTL indexes** for ephemeral data (invitations, password reset tokens, refresh tokens)
- **Schema validation** at Mongoose level (strict mode, required fields, type checking)

## 2. Collection: `users`

```
{
  _id: ObjectId,
  email: string,              // unique, indexed, lowercase
  displayName: string,        // indexed
  passwordHash: string,       // Argon2id hash
  isEmailVerified: boolean,   // default: false
  emailVerificationToken: string | null,    // hashed, short-lived
  emailVerificationExpires: Date | null,    // TTL: 24h
  passwordResetToken: string | null,        // hashed
  passwordResetExpires: Date | null,        // TTL: 15min
  refreshTokens: [{                          // embedded, bounded
    tokenHash: string,
    expiresAt: Date,
    createdAt: Date
  }],
  role: 'user' | 'admin',     // default: 'user'
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ email: 1 }` — unique, lookup by email
- `{ displayName: 'text' }` — text search for inviting
- `{ emailVerificationToken: 1 }` — sparse, lookup verify token
- `{ 'refreshTokens.tokenHash': 1 }` — sparse, lookup refresh token

**Why embedded refreshTokens:** A user has a bounded number of active sessions (typically 1–5). Embedding avoids a separate collection. If session count grows beyond ~20, migrate to separate collection.

**Why hash tokens:** Prevents token theft via database read. Server never stores plaintext tokens.

## 3. Collection: `meetings`

```
{
  _id: ObjectId,
  roomCode: string,           // unique, 8-char alphanumeric
  title: string,              // default: "Meeting"
  hostId: ObjectId,           // ref → users
  coHostIds: ObjectId[],      // ref → users, default: []
  status: 'active' | 'ended' | 'scheduled',
  isLocked: boolean,          // waiting room enabled
  participantIds: ObjectId[], // ref → users, currently in meeting
  maxParticipants: number,    // default: 8
  startedAt: Date | null,
  endedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ roomCode: 1 }` — unique, primary lookup by invite code
- `{ hostId: 1, createdAt: -1 }` — host's meeting history
- `{ status: 1 }` — filter active vs ended
- `{ participantIds: 1 }` — lookup meetings a user is in

**Why roomCode not ObjectId:** Invite URLs must be human-readable, copyable, and not leak database IDs.

**Why coHostIds as array:** Bounded set. A meeting rarely has >5 co-hosts. If unbounded, move to a separate roles collection.

## 4. Collection: `participant_sessions`

```
{
  _id: ObjectId,
  meetingId: ObjectId,        // ref → meetings
  userId: ObjectId,           // ref → users
  role: 'host' | 'co-host' | 'participant',
  isMuted: boolean,
  isCameraOff: boolean,
  isHandRaised: boolean,
  joinedAt: Date,
  leftAt: Date | null,
  deviceInfo: {               // optional, for debugging
    userAgent: string,
    platform: string
  }
}
```

**Indexes:**
- `{ meetingId: 1, userId: 1 }` — unique compound, one session per user per meeting
- `{ meetingId: 1, role: 1 }` — find host/co-hosts
- `{ userId: 1, leftAt: 1 }` — user's meeting history

**Why separate collection instead of embedded participants:** Participant sessions are frequently updated (every mute, camera toggle, hand raise). Embedding would cause the entire meeting document to be written on every toggle, creating contention in busy meetings.

## 5. Collection: `messages`

```
{
  _id: ObjectId,
  meetingId: ObjectId,        // ref → meetings
  senderId: ObjectId,         // ref → users
  senderName: string,         // denormalized for display after user deletion
  content: string,            // validated, max 2000 chars
  type: 'text' | 'system',
  createdAt: Date
}
```

**Indexes:**
- `{ meetingId: 1, createdAt: 1 }` — paginated message history per meeting
- `{ senderId: 1 }` — user's message history

**Why denormalize senderName:** If a user deletes their account, messages still show who sent them. Name changes update only the meeting UI (Socket.IO broadcast is sufficient).

## 6. Collection: `invitations`

```
{
  _id: ObjectId,
  meetingId: ObjectId,
  invitedEmail: string,       // nullable, if inviting specific email
  invitedUserId: ObjectId,    // nullable, if inviting existing user
  token: string,              // hashed invite token
  expiresAt: Date,            // TTL index
  usedAt: Date | null,
  createdBy: ObjectId,
  createdAt: Date
}
```

**Indexes:**
- `{ token: 1 }` — unique, lookup by invite link
- `{ meetingId: 1 }` — list invites for a meeting
- `{ expiresAt: 1 }` — TTL: auto-delete after expiry

## 7. Collection: `notifications`

```
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'meeting_invite' | 'participant_joined' | 'meeting_ended' | 'role_changed' | 'removed_from_meeting',
  title: string,
  body: string,
  metadata: {                 // flexible payload per type
    meetingId?: ObjectId,
    actorName?: string
  },
  isRead: boolean,
  createdAt: Date
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — paginated notification list
- `{ userId: 1, isRead: 1 }` — unread count

## 8. Collection: `audit_logs`

```
{
  _id: ObjectId,
  action: string,             // e.g., 'meeting.ended', 'participant.removed'
  actorId: ObjectId,          // who performed the action
  targetId: ObjectId | null,  // who/what was acted upon
  meetingId: ObjectId | null,
  metadata: object,           // action-specific data
  ip: string,                 // actor IP
  userAgent: string,
  createdAt: Date
}
```

**Indexes:**
- `{ meetingId: 1, createdAt: -1 }` — audit trail per meeting
- `{ actorId: 1, createdAt: -1 }` — audit trail per user
- `{ action: 1, createdAt: -1 }` — filter by action type
- `{ createdAt: 1 }` — TTL optional: auto-archive after 90 days

## 9. Permission Matrix

| Action | Host | Co-Host | Participant | Unauthenticated |
|--------|------|---------|-------------|-----------------|
| Create meeting | ✓ | ✗ | ✗ | ✗ |
| Join meeting | ✓ | ✓ | ✓ | Via invite+auth |
| Send chat | ✓ | ✓ | ✓ | ✗ |
| Share camera/mic | ✓ | ✓ | ✓ | ✗ |
| Share screen | ✓ | ✓ | ✓ | ✗ |
| Raise hand | ✓ | ✓ | ✓ | ✗ |
| Send reaction | ✓ | ✓ | ✓ | ✗ |
| Admit participant from waiting | ✓ | ✓ | ✗ | ✗ |
| Remove participant | ✓ | ✓ | ✗ | ✗ |
| Mute other participant | ✓ | ✓ | ✗ | ✗ |
| Lock meeting | ✓ | ✗ | ✗ | ✗ |
| Unlock meeting | ✓ | ✓ | ✗ | ✗ |
| Assign co-host | ✓ | ✗ | ✗ | ✗ |
| End meeting | ✓ | ✗ | ✗ | ✗ |
| Access meeting history | ✓ (own) | ✓ (own) | ✓ (own) | ✗ |
| Delete message (any) | ✓ | ✗ | ✗ | ✗ |
| Delete message (own) | ✓ | ✓ | ✓ | ✗ |

## 10. API Contract Summary

### Auth Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, set session cookie |
| POST | /api/auth/logout | Yes | Clear session |
| GET | /api/auth/verify-email/:token | No | Verify email |
| POST | /api/auth/forgot-password | No | Send reset email |
| POST | /api/auth/reset-password/:token | No | Reset password |
| GET | /api/auth/session | Yes | Get current session info |

### Meeting Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/meetings | Yes | Create meeting |
| GET | /api/meetings/:roomCode | Optional | Get meeting info (for pre-join) |
| POST | /api/meetings/:roomCode/join | Yes | Join meeting, get tokens |
| POST | /api/meetings/:roomCode/lock | Yes (host/co-host) | Lock/unlock meeting |
| POST | /api/meetings/:roomCode/end | Yes (host) | End meeting |
| GET | /api/meetings/history | Yes | Current user's meeting history |

### Message Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/meetings/:roomCode/messages | Yes (in meeting) | Paginated message history |
| DELETE | /api/meetings/:roomCode/messages/:messageId | Yes (host/owner) | Delete message |

### User Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/users/me | Yes | Get current user profile |
| PATCH | /api/users/me | Yes | Update display name |
| GET | /api/users/search?q= | Yes | Search users to invite |

## 11. Socket.IO Event Contract

### Client → Server Events

| Event | Payload | Auth | Permission | Persist | Rate Limit |
|-------|---------|------|------------|---------|------------|
| `meeting:join` | `{ roomCode, displayName }` | Required | Valid session + meeting exists | Update participant session | 10/min |
| `meeting:leave` | `{ roomCode }` | Required | In meeting | Update participant session | 10/min |
| `chat:send` | `{ roomCode, content }` | Required | In meeting | Yes (DB) | 30/min |
| `reaction:send` | `{ roomCode, reaction }` | Required | In meeting | No | 30/min |
| `hand:raise` | `{ roomCode }` | Required | In meeting | Update participant session | 10/min |
| `hand:lower` | `{ roomCode }` | Required | In meeting | Update participant session | 10/min |
| `participant:mute` | `{ roomCode, targetUserId }` | Required | Host/co-host | Update participant session | 20/min |
| `participant:remove` | `{ roomCode, targetUserId }` | Required | Host/co-host | Update participant session | 10/min |
| `participant:admit` | `{ roomCode, targetUserId }` | Required | Host/co-host | Update participant session | 20/min |
| `meeting:lock` | `{ roomCode }` | Required | Host | Update meeting | 5/min |
| `meeting:unlock` | `{ roomCode }` | Required | Host/co-host | Update meeting | 5/min |
| `meeting:end` | `{ roomCode }` | Required | Host | Update meeting | 5/min |
| `role:assign` | `{ roomCode, targetUserId, role }` | Required | Host | Update participant session | 10/min |
| `media:state` | `{ roomCode, isMuted, isCameraOff }` | Required | In meeting | Update participant session | 30/min |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `participant:joined` | `{ userId, displayName, role, isMuted, isCameraOff }` | New participant arrived |
| `participant:left` | `{ userId }` | Participant left |
| `participant:muted` | `{ userId, mutedBy }` | Participant was muted by host |
| `participant:removed` | `{ userId }` | Participant was removed |
| `participant:admitted` | `{ userId }` | Participant admitted from waiting |
| `participant:role-changed` | `{ userId, newRole }` | Role changed |
| `chat:message` | `{ messageId, senderId, senderName, content, createdAt }` | New chat message |
| `chat:deleted` | `{ messageId }` | Message deleted |
| `reaction:received` | `{ userId, displayName, reaction }` | Emoji reaction |
| `hand:raised` | `{ userId }` | Participant raised hand |
| `hand:lowered` | `{ userId }` | Participant lowered hand |
| `media:state` | `{ userId, isMuted, isCameraOff }` | Media state changed |
| `meeting:locked` | `{ lockedBy }` | Meeting locked |
| `meeting:unlocked` | `{ unlockedBy }` | Meeting unlocked |
| `meeting:ended` | `{ endedBy }` | Meeting ended for all |
| `error` | `{ code, message }` | Error response |

### Socket.IO Error Format

```typescript
{
  code: 'PERMISSION_DENIED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'ROOM_FULL' | 'MEETING_ENDED' | 'UNAUTHORIZED' | 'RATE_LIMITED',
  message: string
}
```

### Acknowledgement Pattern

```typescript
// Client sends event with callback:
socket.emit('chat:send', { roomCode, content }, (response) => {
  if (response.success) {
    // message persisted, id: response.data.messageId
  } else {
    // handle error: response.error.code, response.error.message
  }
});

// Server response:
{
  success: true,
  data: { messageId: string }
}
// or
{
  success: false,
  error: { code: 'VALIDATION_ERROR', message: 'Content exceeds 2000 characters' }
}
```

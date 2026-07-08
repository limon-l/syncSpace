# SyncSpace — UI/UX Planning

## 1. Design Tokens

### Color Palette

```
Background:        #07090F
Surface:           #0E111A
Elevated Surface:  #151925
Primary:           #7C5CFC
Primary Hover:     #6B4DE0
Secondary:         #23C9B8
Danger:            #FF5D6C
Warning:           #F59E0B
Success:           #22C55E
Primary Text:      #F7F8FA
Secondary Text:    #9DA4B3
Border:            #1E2330
```

### Typography

```
Font Family: Inter (body), JetBrains Mono (code, optional)
Base Size:    16px
Scale:        1.25 (major third)
```

### Spacing

4px grid. Multiples of 4 for all spacing (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80).

### Border Radius

```
sm:   6px
md:   8px
lg:   12px
xl:   16px
full: 9999px
```

## 2. Route Map

```
/                                   → Landing (marketing)
├── /auth/login                     → Login form
├── /auth/register                  → Registration form
├── /auth/verify-email              → Verify notice / token handler
├── /auth/forgot-password           → Email input
├── /auth/reset-password/[token]    → New password form
├── /dashboard                      → Overview (upcoming + recent)
│   ├── /dashboard/history          → All past meetings
│   ├── /dashboard/settings         → Profile settings
├── /meeting/prejoin/[roomCode]     → Device check + name
└── /meeting/room/[roomCode]        → Active meeting room
```

## 3. Meeting Room Layout

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar: Meeting title | Timer | Participants count     │
│           | Invite button | Lock indicator               │
├──────────────────────────────────┬───────────────────────┤
│                                  │                       │
│    Participant Video Grid        │   Side Panel          │
│    (responsive, auto-layout)     │   ─────────           │
│                                  │   Tab: People         │
│    Active speaker highlight      │   Tab: Chat           │
│    Connection indicators         │   (drawer on mobile)  │
│    Name labels                   │                       │
│    Hand raise indicator          │                       │
│                                  │                       │
├──────────────────────────────────┴───────────────────────┤
│  Control Bar: Mic | Camera | Share Screen | Hand Raise   │
│               | Chat toggle | People toggle | More | Leave│
└──────────────────────────────────────────────────────────┘
```

## 4. Mobile Adaptation

- Side panels become bottom sheets
- Control bar collapses to essential icons (mic, camera, leave)
- Video grid switches to single-speaker focus
- Overlay controls with tap-to-show/hide
- Touch targets ≥ 44px

## 5. Component Tree (Meeting Room)

```
ActiveMeetingRoom
├── MeetingTopBar (title, timer, participant count, invite button, lock status)
├── MeetingLayout (manages grid vs speaker view, side panel state)
│   ├── VideoGrid
│   │   ├── ParticipantTile (for each participant)
│   │   │   ├── VideoRenderer (LiveKit track)
│   │   │   ├── AvatarFallback (when camera off)
│   │   │   ├── ParticipantNameLabel
│   │   │   ├── MicIndicator
│   │   │   ├── HandRaiseIndicator
│   │   │   ├── ConnectionIndicator
│   │   │   └── ActiveSpeakerBorder
│   │   └── ScreenShareTile (full-width when active)
│   │       └── ScreenShareRenderer
│   └── SidePanel (conditional)
│       ├── PanelTabs (People | Chat)
│       ├── PeoplePanel
│       │   ├── ParticipantListItem (per user)
│       │   │   ├── Name, Role badge, Mic indicator
│       │   │   └── Actions (mute, remove — host only)
│       │   └── WaitingRoomSection (host only)
│       └── ChatPanel
│           ├── MessageList (auto-scroll)
│           │   ├── ChatMessage (sender, content, time)
│           │   └── SystemMessage (participant joined/left)
│           └── ChatInput (text field + send button)
└── ControlBar
    ├── ControlButton (mic toggle)
    ├── ControlButton (camera toggle)
    ├── ControlButton (screen share)
    ├── ControlButton (hand raise)
    ├── ControlButton (chat toggle)
    ├── ControlButton (people toggle)
    ├── MoreMenu (settings, leave)
    └── LeaveButton (red, ends meeting for host)
```

# SimpleSurf Design

An AI browsing assistant for elderly users. Chat and voice interface alongside a live browser view, powered by Browser Use Cloud and Claude.

## Architecture

Single Next.js codebase (existing T3 stack). No Python backend.

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                        │
│                                                      │
│  ┌──────────────┐        ┌────────────────────────┐  │
│  │  Chat Panel   │        │  Browser View (iframe) │  │
│  │  Voice In/Out │        │  Browser Use Cloud     │  │
│  │  Text Chat    │        │  Live Session URL      │  │
│  └──────┬───────┘        └────────────────────────┘  │
│         │ WebSocket                                   │
├─────────┼────────────────────────────────────────────┤
│         ▼                                            │
│  ┌──────────────┐   ┌──────────┐   ┌──────────────┐ │
│  │  WS Handler  │──▶│  Claude   │──▶│ Browser Use  │ │
│  │  (API Route) │   │  (Agent)  │   │ Cloud API    │ │
│  └──────────────┘   └──────────┘   └──────────────┘ │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Prisma  │  │  tRPC    │  │  Better Auth      │  │
│  │  (DB)    │  │ (app API)│  │  (sessions/users) │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘

External Services:
  - Browser Use Cloud: browser automation + live session
  - Deepgram: speech-to-text (client-side JS SDK)
  - ElevenLabs: text-to-speech (server-side)
  - Anthropic: Claude (chat reasoning)
```

## Frontend Layout

Side-by-side: 60% browser view (iframe), 40% chat panel. Stacks vertically on mobile.

```
┌──────────────────────────────────────────────────────────┐
│  SimpleSurf          [Settings]              [Sign Out]   │
├────────────────────────┬─────────────────────────────────┤
│                        │                                 │
│    Browser View        │     Chat Panel                  │
│    (iframe)            │     - Message history            │
│                        │     - Voice button (hold/toggle) │
│    User can click      │     - Text input + send          │
│    to override AI      │                                 │
│                        │                                 │
├────────────────────────┴─────────────────────────────────┤
│  Status: Navigating to bankofamerica.com...              │
└──────────────────────────────────────────────────────────┘
```

### UX Principles

- Large text (18-20px base), large click targets (min 48px)
- High contrast, no subtle grays
- Simple language from the AI, no jargon
- Status bar always shows what's happening
- Prominent voice button
- No initial URL required — AI asks what the user wants to do

## Data Flow

```
User speaks/types
  → Deepgram STT (client-side) transcribes voice to text
  → WebSocket sends text to server
  → Server saves to conversation history (Prisma)
  → Server sends to Claude with conversation context
  → Claude returns:
      1. User-facing message (simple language)
      2. Browser Use task (if needed)
  → Server sends user-facing message via WebSocket
      → Client displays in chat + ElevenLabs TTS speaks it
  → Server calls Browser Use Cloud API with task
      → Gets live session URL
      → Sends URL via WebSocket → client loads in iframe
```

### WebSocket Message Types

| Direction | Type | Payload |
|---|---|---|
| Client → Server | `chat_message` | `{ text: string }` |
| Client → Server | `voice_audio` | `{ text: string }` (transcribed client-side) |
| Server → Client | `assistant_message` | `{ text: string, audio?: string }` |
| Server → Client | `browser_session` | `{ liveUrl: string, status: string }` |
| Server → Client | `status_update` | `{ message: string }` |

## Database Schema Additions

Two new tables added to existing Prisma schema:

```prisma
model Conversation {
  id        String    @id @default(cuid())
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  role           String       // "user" or "assistant"
  content        String
  browserTaskId  String?
  browserStatus  String?      // "running", "completed", "failed"
  createdAt      DateTime     @default(now())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

Existing tables (User, Session, Account, Verification, Post) remain unchanged.

## External Services & Environment Variables

| Service | Purpose | Env Var |
|---|---|---|
| Browser Use Cloud | Browser automation | `BROWSER_USE_API_KEY` |
| Anthropic | Claude reasoning | `ANTHROPIC_API_KEY` |
| Deepgram | STT (client-side) | `NEXT_PUBLIC_DEEPGRAM_API_KEY` |
| Deepgram | STT (server token gen) | `DEEPGRAM_API_KEY` |
| ElevenLabs | TTS (server-side) | `ELEVENLABS_API_KEY` |

## Error Handling

- **Browser Use fails/times out**: AI tells user, offers to retry. Status bar shows error.
- **Bad voice transcription**: Show transcript in chat, ask user to confirm or correct via text.
- **WebSocket disconnects**: Auto-reconnect with backoff. History preserved in Postgres.
- **User clicks in iframe during AI action**: AI unaware of iframe clicks. User can tell AI "I clicked something" and AI reassesses.
- **Long-running tasks**: Status bar keeps user informed. Claude proactively updates after 60s.
- **Auth session expires**: Better Auth handles it. User redirected to sign in.

## Control Model

AI-primary, user can override. The AI drives the browser by default. User watches and converses. User can click in the iframe if they want — the AI adapts when informed.

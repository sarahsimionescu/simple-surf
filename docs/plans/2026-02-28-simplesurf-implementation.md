# SimpleSurf Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI browsing assistant for elderly users with a chat/voice interface alongside a live browser view.

**Architecture:** Single Next.js codebase (T3 stack). Browser Use Cloud API for browser automation. Claude for reasoning. Deepgram for STT. ElevenLabs for TTS. WebSocket via next-ws for real-time communication. Side-by-side layout with chat panel and browser iframe.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, tRPC, Prisma/PostgreSQL, Better Auth, next-ws, browser-use-sdk, @anthropic-ai/sdk, @deepgram/sdk, @elevenlabs/elevenlabs-js

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`
- Modify: `src/env.js`
- Modify: `.env.example`

**Step 1: Install runtime dependencies**

Run:
```bash
pnpm add next-ws ws @anthropic-ai/sdk browser-use-sdk @deepgram/sdk @elevenlabs/elevenlabs-js
```

**Step 2: Install dev dependencies**

Run:
```bash
pnpm add -D @types/ws
```

**Step 3: Add next-ws prepare script to package.json**

In `package.json`, add to `"scripts"`:
```json
"prepare": "next-ws patch"
```

**Step 4: Run prepare to patch Next.js**

Run:
```bash
pnpm run prepare
```

**Step 5: Update `.env.example` with new env vars**

Add to `.env.example`:
```
# Anthropic
ANTHROPIC_API_KEY=""

# Browser Use Cloud
BROWSER_USE_API_KEY=""

# Deepgram
DEEPGRAM_API_KEY=""
NEXT_PUBLIC_DEEPGRAM_API_KEY=""

# ElevenLabs
ELEVENLABS_API_KEY=""
```

**Step 6: Update `src/env.js` with new env var schemas**

Add to the `server` object in `createEnv`:
```typescript
ANTHROPIC_API_KEY: z.string(),
BROWSER_USE_API_KEY: z.string(),
DEEPGRAM_API_KEY: z.string(),
ELEVENLABS_API_KEY: z.string(),
```

Add to the `client` object:
```typescript
NEXT_PUBLIC_DEEPGRAM_API_KEY: z.string(),
```

Add to `runtimeEnv`:
```typescript
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
BROWSER_USE_API_KEY: process.env.BROWSER_USE_API_KEY,
DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
NEXT_PUBLIC_DEEPGRAM_API_KEY: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add dependencies for Browser Use, Claude, Deepgram, ElevenLabs, and WebSocket"
```

---

### Task 2: Database schema — Conversation and Message models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add Conversation model to `prisma/schema.prisma`**

Add after the `Post` model:
```prisma
model Conversation {
  id        String    @id @default(cuid())
  title     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@index([userId])
}
```

**Step 2: Add Message model**

Add after `Conversation`:
```prisma
model Message {
  id             String       @id @default(cuid())
  role           String       // "user" or "assistant"
  content        String
  browserTaskId  String?
  browserStatus  String?      // "running", "completed", "failed"
  createdAt      DateTime     @default(now())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

**Step 3: Add conversations relation to User model**

In the `User` model, add:
```prisma
conversations Conversation[]
```

**Step 4: Generate Prisma client and push schema**

Run:
```bash
pnpm db:push
```

This runs `prisma db push` which updates the database and regenerates the client.

**Step 5: Commit**

```bash
git add prisma/schema.prisma && git commit -m "feat: add Conversation and Message models to schema"
```

---

### Task 3: Browser Use Cloud service module

**Files:**
- Create: `src/server/services/browser-use.ts`

**Step 1: Create the Browser Use service**

Create `src/server/services/browser-use.ts`:

```typescript
import { env } from "~/env";

const BROWSER_USE_API = "https://api.browser-use.com/api/v2";

const headers = () => ({
  "Content-Type": "application/json",
  "X-Browser-Use-API-Key": env.BROWSER_USE_API_KEY,
});

export interface BrowserTask {
  id: string;
  sessionId: string;
}

export interface BrowserTaskResult {
  id: string;
  status: string;
  output?: string;
  steps?: Array<{
    description?: string;
    screenshot?: string;
  }>;
}

export interface BrowserSession {
  id: string;
  liveUrl?: string;
  status: string;
}

export async function createTask(task: string, options?: {
  startUrl?: string;
  maxSteps?: number;
}): Promise<BrowserTask> {
  const res = await fetch(`${BROWSER_USE_API}/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      task,
      llm: "claude-sonnet-4-20250514",
      startUrl: options?.startUrl,
      maxSteps: options?.maxSteps ?? 20,
      vision: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Browser Use API error: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<BrowserTask>;
}

export async function getTask(taskId: string): Promise<BrowserTaskResult> {
  const res = await fetch(`${BROWSER_USE_API}/tasks/${taskId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Browser Use API error: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<BrowserTaskResult>;
}

export async function getSession(sessionId: string): Promise<BrowserSession> {
  const res = await fetch(`${BROWSER_USE_API}/sessions/${sessionId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Browser Use API error: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<BrowserSession>;
}

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BROWSER_USE_API}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ action: "stop" }),
  });
}
```

**Step 2: Commit**

```bash
git add src/server/services/browser-use.ts && git commit -m "feat: add Browser Use Cloud service module"
```

---

### Task 4: Claude agent service module

**Files:**
- Create: `src/server/services/claude-agent.ts`

**Step 1: Create the Claude agent service**

Create `src/server/services/claude-agent.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are SimpleSurf, a friendly browsing assistant designed to help elderly users navigate the internet.

Your personality:
- Warm, patient, and reassuring
- Use simple, clear language — no technical jargon
- Explain what you're doing step by step
- If something goes wrong, stay calm and offer to try again

When the user asks you to do something on the web, respond with:
1. A friendly message explaining what you'll do (this gets shown to the user)
2. A browser task instruction (this gets sent to Browser Use to execute)

Format your response as JSON:
{
  "message": "What you say to the user (simple, friendly language)",
  "browserTask": "Detailed instruction for the browser automation agent" | null,
  "startUrl": "URL to start from, if known" | null
}

If the user is just chatting (not asking to browse), set browserTask to null.
Always respond with valid JSON only.`;

export interface AgentResponse {
  message: string;
  browserTask: string | null;
  startUrl: string | null;
}

export async function getAgentResponse(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
): Promise<AgentResponse> {
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text) as AgentResponse;
  } catch {
    // If Claude doesn't return valid JSON, treat the whole response as a message
    return {
      message: text,
      browserTask: null,
      startUrl: null,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/server/services/claude-agent.ts && git commit -m "feat: add Claude agent service module"
```

---

### Task 5: ElevenLabs TTS service module

**Files:**
- Create: `src/server/services/tts.ts`

**Step 1: Create the TTS service**

Create `src/server/services/tts.ts`:

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "~/env";

const client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });

// "Rachel" — clear, warm, friendly voice good for elderly users
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function textToSpeech(text: string): Promise<Buffer> {
  const audioStream = await client.textToSpeech.convert(DEFAULT_VOICE_ID, {
    text,
    modelId: "eleven_multilingual_v2",
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
```

**Step 2: Commit**

```bash
git add src/server/services/tts.ts && git commit -m "feat: add ElevenLabs TTS service module"
```

---

### Task 6: WebSocket handler and chat orchestration

**Files:**
- Create: `src/app/api/ws/route.ts`

**Step 1: Create the WebSocket route handler**

Create `src/app/api/ws/route.ts`:

```typescript
import type { WebSocket } from "ws";
import { db } from "~/server/db";
import { getAgentResponse } from "~/server/services/claude-agent";
import * as browserUse from "~/server/services/browser-use";
import { textToSpeech } from "~/server/services/tts";

interface IncomingMessage {
  type: "chat_message" | "voice_audio";
  text: string;
  conversationId?: string;
}

interface OutgoingMessage {
  type: "assistant_message" | "browser_session" | "status_update" | "conversation_id" | "error";
  text?: string;
  audio?: string;
  liveUrl?: string;
  status?: string;
  conversationId?: string;
  message?: string;
}

function send(client: WebSocket, msg: OutgoingMessage) {
  if (client.readyState === client.OPEN) {
    client.send(JSON.stringify(msg));
  }
}

export function UPGRADE(client: WebSocket) {
  // TODO: authenticate WebSocket connections by extracting session from cookies
  // For now, we'll need to pass userId in the first message or use a handshake

  let currentConversationId: string | null = null;
  let userId: string | null = null;

  client.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString()) as IncomingMessage & { userId?: string };

      // First message should include userId for auth
      if (!userId && data.userId) {
        userId = data.userId;
      }

      if (!userId) {
        send(client, { type: "error", message: "Not authenticated" });
        return;
      }

      const messageText = data.text;
      if (!messageText) return;

      // Create or use existing conversation
      if (data.conversationId) {
        currentConversationId = data.conversationId;
      }

      if (!currentConversationId) {
        const conversation = await db.conversation.create({
          data: {
            userId,
            title: messageText.slice(0, 100),
          },
        });
        currentConversationId = conversation.id;
        send(client, { type: "conversation_id", conversationId: conversation.id });
      }

      // Save user message
      await db.message.create({
        data: {
          role: "user",
          content: messageText,
          conversationId: currentConversationId,
        },
      });

      // Get conversation history for context
      const history = await db.message.findMany({
        where: { conversationId: currentConversationId },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      const conversationHistory = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Get Claude's response
      send(client, { type: "status_update", status: "Thinking..." });
      const agentResponse = await getAgentResponse(conversationHistory, messageText);

      // Save assistant message
      const savedMessage = await db.message.create({
        data: {
          role: "assistant",
          content: agentResponse.message,
          conversationId: currentConversationId,
        },
      });

      // Generate TTS audio
      let audioBase64: string | undefined;
      try {
        const audioBuffer = await textToSpeech(agentResponse.message);
        audioBase64 = audioBuffer.toString("base64");
      } catch (err) {
        console.error("TTS failed:", err);
        // Non-fatal — still send text response
      }

      // Send assistant message to client
      send(client, {
        type: "assistant_message",
        text: agentResponse.message,
        audio: audioBase64,
      });

      // If there's a browser task, execute it
      if (agentResponse.browserTask) {
        send(client, {
          type: "status_update",
          status: "Opening browser...",
        });

        try {
          const task = await browserUse.createTask(agentResponse.browserTask, {
            startUrl: agentResponse.startUrl ?? undefined,
          });

          // Update message with browser task ID
          await db.message.update({
            where: { id: savedMessage.id },
            data: {
              browserTaskId: task.id,
              browserStatus: "running",
            },
          });

          // Get the live session URL
          const session = await browserUse.getSession(task.sessionId);
          if (session.liveUrl) {
            send(client, {
              type: "browser_session",
              liveUrl: session.liveUrl,
              status: "running",
            });
          }

          send(client, {
            type: "status_update",
            status: "Working on it...",
          });

          // Poll for task completion
          const pollInterval = setInterval(async () => {
            try {
              const result = await browserUse.getTask(task.id);
              if (result.status === "completed" || result.status === "failed") {
                clearInterval(pollInterval);

                await db.message.update({
                  where: { id: savedMessage.id },
                  data: { browserStatus: result.status },
                });

                send(client, {
                  type: "status_update",
                  status: result.status === "completed" ? "Done!" : "Something went wrong",
                });

                if (result.output) {
                  // Ask Claude to summarize the result for the user
                  const summaryResponse = await getAgentResponse(
                    [...conversationHistory, { role: "assistant", content: agentResponse.message }],
                    `The browser task completed. Here's the result: ${result.output}. Summarize this for the user in simple terms.`,
                  );

                  await db.message.create({
                    data: {
                      role: "assistant",
                      content: summaryResponse.message,
                      conversationId: currentConversationId!,
                    },
                  });

                  send(client, {
                    type: "assistant_message",
                    text: summaryResponse.message,
                  });
                }
              }
            } catch (err) {
              clearInterval(pollInterval);
              console.error("Task polling error:", err);
            }
          }, 3000);

          // Safety timeout: stop polling after 2 minutes
          setTimeout(() => clearInterval(pollInterval), 120000);
        } catch (err) {
          console.error("Browser Use error:", err);
          send(client, {
            type: "status_update",
            status: "I had trouble opening the browser. Want me to try again?",
          });
        }
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
      send(client, { type: "error", message: "Something went wrong. Please try again." });
    }
  });

  client.once("close", () => {
    console.log("Client disconnected");
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/ws/route.ts && git commit -m "feat: add WebSocket handler with chat orchestration"
```

---

### Task 7: tRPC routes for conversation history

**Files:**
- Create: `src/server/api/routers/conversation.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create conversation router**

Create `src/server/api/routers/conversation.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const conversationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.conversation.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the conversation belongs to this user
      const conversation = await ctx.db.conversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return ctx.db.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "asc" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.conversation.deleteMany({
        where: {
          id: input.conversationId,
          userId: ctx.session.user.id,
        },
      });
    }),
});
```

**Step 2: Add conversation router to root**

In `src/server/api/root.ts`, add the import and register:

```typescript
import { conversationRouter } from "~/server/api/routers/conversation";
```

Update the router:
```typescript
export const appRouter = createTRPCRouter({
  post: postRouter,
  conversation: conversationRouter,
});
```

**Step 3: Commit**

```bash
git add src/server/api/routers/conversation.ts src/server/api/root.ts && git commit -m "feat: add tRPC conversation router"
```

---

### Task 8: Frontend — Chat panel component

**Files:**
- Create: `src/app/_components/chat-panel.tsx`

**Step 1: Create the chat panel component**

Create `src/app/_components/chat-panel.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onBrowserSession: (liveUrl: string) => void;
  onStatusUpdate: (status: string) => void;
  userId: string;
}

export function ChatPanel({ onBrowserSession, onStatusUpdate, userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      // Send userId for auth
      ws.send(JSON.stringify({ type: "chat_message", text: "", userId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        text?: string;
        audio?: string;
        liveUrl?: string;
        status?: string;
        message?: string;
      };

      switch (data.type) {
        case "assistant_message":
          if (data.text) {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "assistant", content: data.text! },
            ]);
          }
          // Play audio if available
          if (data.audio) {
            const audioBlob = new Blob(
              [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
              { type: "audio/mpeg" },
            );
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.play().catch(console.error);
            }
          }
          break;
        case "browser_session":
          if (data.liveUrl) onBrowserSession(data.liveUrl);
          break;
        case "status_update":
          if (data.status) onStatusUpdate(data.status);
          break;
        case "error":
          onStatusUpdate(data.message ?? "An error occurred");
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  }, [userId, onBrowserSession, onStatusUpdate]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);

    wsRef.current.send(JSON.stringify({ type: "chat_message", text }));
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
        <div className="flex items-center gap-2 mt-1">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm text-gray-500">
            {isConnected ? "Connected" : "Reconnecting..."}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-lg">Hi there! What website would you like to visit today?</p>
            <p className="text-base mt-2">You can type or use the microphone to speak.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 text-lg leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800 border border-gray-200 shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 px-6 py-4 text-lg text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isConnected}
            className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>

      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/_components/chat-panel.tsx && git commit -m "feat: add chat panel component with WebSocket"
```

---

### Task 9: Frontend — Browser view component

**Files:**
- Create: `src/app/_components/browser-view.tsx`

**Step 1: Create the browser view component**

Create `src/app/_components/browser-view.tsx`:

```tsx
"use client";

interface BrowserViewProps {
  liveUrl: string | null;
}

export function BrowserView({ liveUrl }: BrowserViewProps) {
  if (!liveUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🌐</div>
          <p className="text-xl text-gray-500">
            Tell me what you&apos;d like to browse
          </p>
          <p className="text-lg text-gray-400 mt-2">
            The website will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={liveUrl}
      className="h-full w-full border-0"
      title="Browser session"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/app/_components/browser-view.tsx && git commit -m "feat: add browser view iframe component"
```

---

### Task 10: Frontend — Main browse page with side-by-side layout

**Files:**
- Create: `src/app/browse/page.tsx`

**Step 1: Create the browse page**

Create `src/app/browse/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { BrowseClient } from "./browse-client";

export default async function BrowsePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return <BrowseClient userId={session.user.id} userName={session.user.name} />;
}
```

**Step 2: Create the client component**

Create `src/app/browse/browse-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChatPanel } from "~/app/_components/chat-panel";
import { BrowserView } from "~/app/_components/browser-view";

interface BrowseClientProps {
  userId: string;
  userName: string;
}

export function BrowseClient({ userId, userName }: BrowseClientProps) {
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-2xl font-bold text-gray-800">SimpleSurf</h1>
        <div className="flex items-center gap-4">
          <span className="text-lg text-gray-600">{userName}</span>
          <a
            href="/"
            className="rounded-full bg-gray-100 px-5 py-2 text-base font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Sign Out
          </a>
        </div>
      </header>

      {/* Main content: side-by-side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Browser view — 60% */}
        <div className="w-3/5 border-r border-gray-200">
          <BrowserView liveUrl={liveUrl} />
        </div>

        {/* Chat panel — 40% */}
        <div className="w-2/5">
          <ChatPanel
            userId={userId}
            onBrowserSession={setLiveUrl}
            onStatusUpdate={setStatus}
          />
        </div>
      </div>

      {/* Status bar */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-2">
        <p className="text-base text-gray-500">{status}</p>
      </footer>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/browse/ && git commit -m "feat: add browse page with side-by-side layout"
```

---

### Task 11: Voice — Deepgram STT (client-side)

**Files:**
- Create: `src/app/_components/voice-button.tsx`
- Modify: `src/app/_components/chat-panel.tsx`

**Step 1: Create the voice button component**

Create `src/app/_components/voice-button.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      // Connect to Deepgram WebSocket
      const dgApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true`,
        ["token", dgApiKey ?? ""],
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setIsListening(true);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        mediaRecorder.start(250); // Send chunks every 250ms
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          is_final?: boolean;
          channel?: {
            alternatives?: Array<{ transcript?: string }>;
          };
        };
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && data.is_final) {
          onTranscript(transcript);
        }
      };

      socket.onerror = () => {
        stopListening();
      };
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    socketRef.current?.close();
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={() => void startListening()}
      onMouseUp={stopListening}
      onMouseLeave={stopListening}
      onTouchStart={() => void startListening()}
      onTouchEnd={stopListening}
      className={`flex items-center justify-center rounded-full p-4 text-2xl transition ${
        isListening
          ? "bg-red-500 text-white scale-110 shadow-lg"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title="Hold to speak"
    >
      {isListening ? "..." : "Mic"}
    </button>
  );
}
```

**Step 2: Integrate voice button into chat panel**

In `src/app/_components/chat-panel.tsx`, add the import at the top:
```typescript
import { VoiceButton } from "./voice-button";
```

Add a `sendVoiceMessage` function inside `ChatPanel`:
```typescript
const sendVoiceMessage = (text: string) => {
  if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

  setMessages((prev) => [
    ...prev,
    { id: crypto.randomUUID(), role: "user", content: text },
  ]);

  wsRef.current.send(JSON.stringify({ type: "voice_audio", text }));
};
```

Add the `VoiceButton` to the input area, next to the text input. Replace the form section:
```tsx
<div className="border-t border-gray-200 bg-white px-6 py-4">
  <div className="flex items-center gap-3">
    <VoiceButton onTranscript={sendVoiceMessage} disabled={!isConnected} />
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage();
      }}
      className="flex flex-1 gap-3"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 rounded-full border border-gray-300 px-6 py-4 text-lg text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="submit"
        disabled={!input.trim() || !isConnected}
        className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  </div>
</div>
```

**Step 3: Commit**

```bash
git add src/app/_components/voice-button.tsx src/app/_components/chat-panel.tsx && git commit -m "feat: add Deepgram voice input with hold-to-speak"
```

---

### Task 12: Update homepage with link to browse page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Simplify homepage and add browse link**

Replace the content of `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  // If logged in, go straight to browse
  if (session?.user) {
    redirect("/browse");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-6xl font-bold text-gray-800">SimpleSurf</h1>
        <p className="max-w-md text-xl text-gray-600">
          Your friendly browsing assistant. Just tell me what you need and
          I&apos;ll help you navigate the web.
        </p>
        <form>
          <button
            className="rounded-full bg-blue-600 px-10 py-4 text-xl font-semibold text-white transition hover:bg-blue-700"
            formAction={async () => {
              "use server";
              const res = await auth.api.signInSocial({
                body: {
                  provider: "github",
                  callbackURL: "/browse",
                },
              });
              if (!res.url) {
                throw new Error("No URL returned from signInSocial");
              }
              redirect(res.url);
            }}
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: update homepage to redirect to browse page"
```

---

### Task 13: Verify and fix build

**Step 1: Run type check**

Run:
```bash
pnpm typecheck
```

Fix any TypeScript errors.

**Step 2: Run lint**

Run:
```bash
pnpm lint
```

Fix any lint errors.

**Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve type and lint errors"
```

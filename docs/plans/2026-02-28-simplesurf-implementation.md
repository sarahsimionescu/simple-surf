# SimpleSurf Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI browsing assistant for elderly users with a chat/voice interface alongside a live browser view.

**Architecture:** Single Next.js codebase (T3 stack). Vercel AI SDK with `useChat` for chat streaming. Claude as the reasoning layer with a custom `browse` tool that triggers Browser Use Cloud. When Claude calls the `browse` tool, the frontend listens via message parts and renders the live session iframe. Upstash Redis for session/state caching. Deepgram for STT, ElevenLabs for TTS.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, tRPC, Prisma/PostgreSQL, Better Auth, `ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`, `@upstash/redis`, `@deepgram/sdk`, `@elevenlabs/elevenlabs-js`

---

### Task 1: Install dependencies and configure environment

**Files:**
- Modify: `package.json`
- Modify: `src/env.js`
- Modify: `.env.example`

**Step 1: Install Vercel AI SDK and Anthropic provider**

Run:
```bash
pnpm add ai @ai-sdk/anthropic @ai-sdk/react
```

**Step 2: Install Upstash Redis**

Run:
```bash
pnpm add @upstash/redis
```

**Step 3: Install remaining service SDKs**

Run:
```bash
pnpm add @deepgram/sdk @elevenlabs/elevenlabs-js
```

**Step 4: Update `.env.example` with new env vars**

Add to `.env.example`:
```
# Anthropic (used by Vercel AI SDK)
ANTHROPIC_API_KEY=""

# Browser Use Cloud
BROWSER_USE_API_KEY=""

# Upstash Redis
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Deepgram
NEXT_PUBLIC_DEEPGRAM_API_KEY=""

# ElevenLabs
ELEVENLABS_API_KEY=""
```

**Step 5: Update `src/env.js` with new env var schemas**

Add to the `server` object in `createEnv`:
```typescript
ANTHROPIC_API_KEY: z.string(),
BROWSER_USE_API_KEY: z.string(),
UPSTASH_REDIS_REST_URL: z.string().url(),
UPSTASH_REDIS_REST_TOKEN: z.string(),
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
UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
NEXT_PUBLIC_DEEPGRAM_API_KEY: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY,
```

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/env.js .env.example && git commit -m "feat: add Vercel AI SDK, Upstash Redis, Deepgram, and ElevenLabs dependencies"
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

**Step 5: Commit**

```bash
git add prisma/schema.prisma && git commit -m "feat: add Conversation and Message models to schema"
```

---

### Task 3: Upstash Redis client setup

**Files:**
- Create: `src/server/redis.ts`

**Step 1: Create the Redis client module**

Create `src/server/redis.ts`:

```typescript
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
```

This uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from environment automatically.

Redis will be used for:
- Caching active browser session URLs per user (so the frontend can reconnect)
- Rate limiting API calls

**Step 2: Commit**

```bash
git add src/server/redis.ts && git commit -m "feat: add Upstash Redis client"
```

---

### Task 4: Browser Use Cloud service module

**Files:**
- Create: `src/server/services/browser-use.ts`

**Step 1: Create the Browser Use service**

Create `src/server/services/browser-use.ts`:

```typescript
import { env } from "~/env";
import { redis } from "~/server/redis";

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

export async function createTask(
  task: string,
  options?: { startUrl?: string; maxSteps?: number },
): Promise<BrowserTask> {
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

// Cache the active session URL for a user in Redis (expires in 4 hours — max session length)
export async function cacheSessionUrl(userId: string, liveUrl: string, taskId: string): Promise<void> {
  await redis.set(`session:${userId}`, JSON.stringify({ liveUrl, taskId }), { ex: 14400 });
}

export async function getCachedSession(userId: string): Promise<{ liveUrl: string; taskId: string } | null> {
  const data = await redis.get<string>(`session:${userId}`);
  if (!data) return null;
  return JSON.parse(data) as { liveUrl: string; taskId: string };
}
```

**Step 2: Commit**

```bash
git add src/server/services/browser-use.ts && git commit -m "feat: add Browser Use Cloud service with Redis session caching"
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

// "Rachel" — clear, warm, friendly voice
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

### Task 6: Chat API route with Vercel AI SDK and `browse` tool

**Files:**
- Create: `src/app/api/chat/route.ts`

**Step 1: Create the chat API route**

This is the core of the app. It uses `streamText` from the Vercel AI SDK with Claude and defines a `browse` tool. When Claude decides the user wants to browse something, it calls the `browse` tool — the tool executes server-side (creates Browser Use task, gets live URL) and returns the result. The frontend receives the tool call as a message part and renders the iframe.

Create `src/app/api/chat/route.ts`:

```typescript
import { streamText, tool, type UIMessage, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import * as browserUse from "~/server/services/browser-use";

const SYSTEM_PROMPT = `You are SimpleSurf, a friendly browsing assistant designed to help elderly users navigate the internet.

Your personality:
- Warm, patient, and reassuring
- Use simple, clear language — no technical jargon
- Explain what you're doing step by step
- If something goes wrong, stay calm and offer to try again

When the user wants to visit a website or do something online:
1. Tell them what you'll do in simple terms
2. Use the browse tool to open the website for them

When the user is just chatting, respond naturally without using tools.

Always keep responses short and clear. Avoid walls of text.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      browse: tool({
        description:
          "Open a website or perform a browsing task for the user. Use this when the user wants to visit a website, search for something, fill out a form, or do anything on the web.",
        inputSchema: z.object({
          task: z
            .string()
            .describe(
              "Detailed description of what to do in the browser, e.g. 'Go to google.com and search for flights to Toronto'",
            ),
          startUrl: z
            .string()
            .optional()
            .describe("The URL to start from, if known"),
        }),
        execute: async ({ task, startUrl }) => {
          const browserTask = await browserUse.createTask(task, {
            startUrl,
          });

          const session = await browserUse.getSession(browserTask.sessionId);

          return {
            taskId: browserTask.id,
            sessionId: browserTask.sessionId,
            liveUrl: session.liveUrl ?? null,
            status: "running",
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

**Step 2: Commit**

```bash
git add src/app/api/chat/route.ts && git commit -m "feat: add chat API route with Vercel AI SDK and browse tool"
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

In `src/server/api/root.ts`, add the import:

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

### Task 8: Frontend — Chat panel with `useChat` and tool part rendering

**Files:**
- Create: `src/app/_components/chat-panel.tsx`

**Step 1: Create the chat panel component**

This uses the Vercel AI SDK's `useChat` hook. It listens for `tool-browse` parts in assistant messages and calls `onBrowserSession` when a live URL is returned.

Create `src/app/_components/chat-panel.tsx`:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";

interface ChatPanelProps {
  onBrowserSession: (liveUrl: string) => void;
  onStatusUpdate: (status: string) => void;
}

export function ChatPanel({ onBrowserSession, onStatusUpdate }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watch for browse tool results in messages
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (
          part.type === "tool-browse" &&
          part.state === "output-available" &&
          part.output?.liveUrl
        ) {
          onBrowserSession(part.output.liveUrl as string);
          onStatusUpdate(
            part.output.status === "running"
              ? "Browsing..."
              : "Done!"
          );
        }
      }
    }
  }, [messages, onBrowserSession, onStatusUpdate]);

  // Update status based on streaming state
  useEffect(() => {
    if (isLoading) {
      onStatusUpdate("Thinking...");
    }
  }, [isLoading, onStatusUpdate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-lg">
              Hi there! What website would you like to visit today?
            </p>
            <p className="text-base mt-2">
              You can type or use the microphone to speak.
            </p>
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
              {msg.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return <span key={i}>{part.text}</span>;
                  case "tool-browse":
                    if (part.state === "input-available" || part.state === "input-streaming") {
                      return (
                        <p key={i} className="text-sm text-gray-500 italic mt-2">
                          Opening browser...
                        </p>
                      );
                    }
                    if (part.state === "output-available") {
                      return (
                        <p key={i} className="text-sm text-green-600 mt-2">
                          Browser is ready!
                        </p>
                      );
                    }
                    if (part.state === "output-error") {
                      return (
                        <p key={i} className="text-sm text-red-500 mt-2">
                          Something went wrong with the browser. Want me to try again?
                        </p>
                      );
                    }
                    return null;
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-5 py-3 text-lg text-gray-400 border border-gray-200 shadow-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 px-6 py-4 text-lg text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/_components/chat-panel.tsx && git commit -m "feat: add chat panel with useChat and browse tool rendering"
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
        <div className="text-center px-8">
          <p className="text-5xl mb-6">🌐</p>
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

### Task 10: Frontend — Browse page with side-by-side layout

**Files:**
- Create: `src/app/browse/page.tsx`
- Create: `src/app/browse/browse-client.tsx`

**Step 1: Create the browse page (server component)**

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

  return <BrowseClient userName={session.user.name} />;
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
  userName: string;
}

export function BrowseClient({ userName }: BrowseClientProps) {
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

### Task 11: Voice — Deepgram STT (client-side) and ElevenLabs TTS playback

**Files:**
- Create: `src/app/_components/voice-button.tsx`
- Create: `src/app/api/tts/route.ts`
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

      const dgApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      const socket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true",
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
        mediaRecorder.start(250);
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
      className={`flex items-center justify-center rounded-full p-4 text-2xl transition min-w-[56px] min-h-[56px] ${
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

**Step 2: Create TTS API route**

This route takes text and returns audio from ElevenLabs. The frontend calls this to play assistant responses aloud.

Create `src/app/api/tts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { textToSpeech } from "~/server/services/tts";

export async function POST(req: Request) {
  const { text }: { text: string } = await req.json();

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const audioBuffer = await textToSpeech(text);
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
```

**Step 3: Update chat panel with voice button and TTS playback**

In `src/app/_components/chat-panel.tsx`, add the import:
```typescript
import { VoiceButton } from "./voice-button";
```

Add a ref for audio playback and a TTS function inside `ChatPanel`:
```typescript
const audioRef = useRef<HTMLAudioElement | null>(null);

const playTTS = async (text: string) => {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(console.error);
    }
  } catch (err) {
    console.error("TTS playback error:", err);
  }
};
```

Add a `sendVoiceMessage` function:
```typescript
const sendVoiceMessage = (text: string) => {
  if (!text.trim() || isLoading) return;
  sendMessage({ text });
};
```

Add an effect to play TTS for new assistant messages:
```typescript
const lastPlayedRef = useRef<string | null>(null);

useEffect(() => {
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === "assistant" && lastMsg.id !== lastPlayedRef.current) {
    const textParts = lastMsg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ");
    if (textParts && status !== "streaming") {
      lastPlayedRef.current = lastMsg.id;
      void playTTS(textParts);
    }
  }
}, [messages, status]);
```

Update the input area JSX to include the voice button:
```tsx
<div className="border-t border-gray-200 bg-white px-6 py-4">
  <div className="flex items-center gap-3">
    <VoiceButton onTranscript={sendVoiceMessage} disabled={isLoading} />
    <form onSubmit={handleSubmit} className="flex flex-1 gap-3">
      <input ... />
      <button ... >Send</button>
    </form>
  </div>
</div>
```

Add a hidden audio element before the closing `</div>`:
```tsx
<audio ref={audioRef} className="hidden" />
```

**Step 4: Commit**

```bash
git add src/app/_components/voice-button.tsx src/app/api/tts/route.ts src/app/_components/chat-panel.tsx && git commit -m "feat: add voice input (Deepgram STT) and voice output (ElevenLabs TTS)"
```

---

### Task 12: Update homepage to redirect authenticated users to browse

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace the homepage**

Replace the content of `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

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

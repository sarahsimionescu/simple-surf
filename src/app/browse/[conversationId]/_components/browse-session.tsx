"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { RenderScreen } from "~/app/_components/render-screen";
import { useStreamingTTS } from "~/hooks/use-streaming-tts";
import Link from "next/link";

function clog(tag: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}][UI:${tag}]`, ...args);
}

interface ActiveScreen {
  type: "select-one" | "select-multi" | "text" | "auth";
  prompt: string;
  options?: string[];
  toolCallId: string;
}

// animated dots for loading states
function PulsingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A4A48]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A4A48] [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A4A48] [animation-delay:0.4s]" />
    </span>
  );
}

// inline markdown: **bold**, *italic*, `code`
function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code
              key={i}
              className="rounded bg-[#141414]/[0.06] px-1.5 py-0.5 text-[0.9em]"
            >
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// block-level markdown: headings, lists, paragraphs
function FormattedText({ text }: { text: string }) {
  const safeText = typeof text === "string" ? text : String(text ?? "");
  const lines = safeText.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const Tag = currentList.type;
    blocks.push(
      <Tag
        key={`list-${blocks.length}`}
        className={`my-1 space-y-0.5 ${Tag === "ol" ? "list-decimal" : "list-disc"} pl-5`}
      >
        {currentList.items.map((item, j) => (
          <li key={j}>
            <InlineFormatted text={item} />
          </li>
        ))}
      </Tag>,
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // headings
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1]!.length;
      const content = headingMatch[2]!;
      const sizeClass =
        level === 1
          ? "text-lg font-bold"
          : level === 2
            ? "text-base font-bold"
            : "text-[15px] font-semibold";
      blocks.push(
        <p key={`h-${i}`} className={`${sizeClass} mt-2 first:mt-0`}>
          <InlineFormatted text={content} />
        </p>,
      );
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const item = line.replace(/^[-*]\s+/, "");
      if (currentList?.type === "ul") {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { type: "ul", items: [item] };
      }
      continue;
    }

    // ordered list
    const olMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (olMatch) {
      const item = olMatch[1]!;
      if (currentList?.type === "ol") {
        currentList.items.push(item);
      } else {
        flushList();
        currentList = { type: "ol", items: [item] };
      }
      continue;
    }

    // blank line = paragraph break
    if (line.trim() === "") {
      flushList();
      blocks.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // regular text
    flushList();
    blocks.push(
      <span key={`p-${i}`} className="block">
        <InlineFormatted text={line} />
      </span>,
    );
  }

  flushList();
  return <div className="space-y-0.5">{blocks}</div>;
}

export function BrowseSession({
  conversationId,
  browserSessionId,
  browserLiveUrl,
  initialMessages = [],
  isNew = false,
}: {
  conversationId: string;
  browserSessionId: string;
  browserLiveUrl: string | null;
  initialMessages?: UIMessage[];
  isNew?: boolean;
}) {
  const [input, setInput] = useState("");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const submittedToolCalls = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sentViaMicRef = useRef(false);
  const streamingTTS = useStreamingTTS();

  useEffect(() => {
    return () => {
      streamingTTS.stop();
    };
  }, [streamingTTS]);

  // Log mount
  useEffect(() => {
    clog(
      "MOUNT",
      `conversationId=${conversationId} browserSessionId=${browserSessionId} isNew=${isNew} initialMessages=${initialMessages.length}`,
    );
    for (const msg of initialMessages) {
      const partSummary = msg.parts.map((p) => p.type).join(", ");
      clog(
        "MOUNT:INITIAL",
        `[${msg.role}] id=${msg.id} parts=[${partSummary}]`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // request geolocation on mount, store in cookie for server access
  useEffect(() => {
    if (!navigator.geolocation) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? "";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.cookie = `user_location=${pos.coords.latitude},${pos.coords.longitude},${city};path=/;max-age=86400;SameSite=Lax`;
      },
      () => {
        document.cookie = `user_location=,,${city};path=/;max-age=86400;SameSite=Lax`;
      },
    );
  }, []);

  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
  } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (err) => {
      clog("CHAT:ERROR", "useChat error:", err);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Log status changes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      clog("CHAT:STATUS", `${prevStatusRef.current} → ${status}`);
      prevStatusRef.current = status;
    }
  }, [status]);

  // Log message count changes
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (prevMsgCountRef.current !== messages.length) {
      clog(
        "CHAT:MESSAGES",
        `count: ${prevMsgCountRef.current} → ${messages.length}`,
      );
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const partSummary = lastMsg.parts.map((p) => {
          if (p.type === "text")
            return `text:"${(p as { text: string }).text.slice(0, 60)}"`;
          if (p.type.startsWith("tool-") && "state" in p)
            return `${p.type}(${(p as { state: string }).state})`;
          if (p.type === "tool-invocation" && "toolName" in p) {
            const inv = p as { toolName: string; state: string };
            return `tool-invocation:${inv.toolName}(${inv.state})`;
          }
          return p.type;
        });
        clog(
          "CHAT:LAST_MSG",
          `[${lastMsg.role}] id=${lastMsg.id} parts=[${partSummary.join(", ")}]`,
        );
      }
      prevMsgCountRef.current = messages.length;
    }
  }, [messages]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Start streaming TTS when AI begins responding to a voice message
  const ttsStartedRef = useRef(false);
  useEffect(() => {
    const isStreaming = status === "streaming" || status === "submitted";

    // Start TTS when streaming begins and we're in voice mode
    if (isStreaming && sentViaMicRef.current && !ttsStartedRef.current) {
      ttsStartedRef.current = true;
      void streamingTTS.start();
    }

    // When streaming ends, flush remaining audio and reset
    if (status === "ready" && ttsStartedRef.current) {
      ttsStartedRef.current = false;
      sentViaMicRef.current = false;
      streamingTTS.finish();
    }
  }, [status, streamingTTS]);

  // Pipe text deltas to the streaming TTS as they arrive
  useEffect(() => {
    if (!streamingTTS.isActive()) return;

    // Find the latest assistant message and extract its text
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const textParts = lastAssistant.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");

    if (textParts.trim()) {
      streamingTTS.sendText(textParts);
    }
  }, [messages, streamingTTS]);

  // scan messages for active renderScreen tool calls
  useEffect(() => {
    clog(
      "RENDER_SCAN",
      `Scanning ${messages.length} messages for renderScreen tool calls`,
    );
    let found = false;
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type.startsWith("tool-") &&
          "toolCallId" in part &&
          "state" in part
        ) {
          const tcId = (part as { toolCallId: string }).toolCallId;
          clog(
            "RENDER_SCAN",
            `Found tool part: type=${part.type} state=${(part as { state: string }).state} toolCallId=${tcId} submitted=${submittedToolCalls.current.has(tcId)}`,
          );
        }
        if (
          part.type.startsWith("tool-") &&
          "toolCallId" in part &&
          "state" in part &&
          part.state === "input-available" &&
          !submittedToolCalls.current.has(
            (part as { toolCallId: string }).toolCallId,
          )
        ) {
          if (part.type === "tool-renderScreen" && "input" in part) {
            const toolInput = part.input as {
              type: "select-one" | "select-multi" | "text" | "auth";
              prompt: string;
              options?: string[];
            };
            clog(
              "RENDER_SCAN",
              `✓ Setting active screen: type=${toolInput.type} prompt="${toolInput.prompt}" toolCallId=${(part as { toolCallId: string }).toolCallId}`,
            );
            setActiveScreen({
              type: toolInput.type,
              prompt: toolInput.prompt,
              options: toolInput.options,
              toolCallId: (part as { toolCallId: string }).toolCallId,
            });
            found = true;
            return;
          }
        }
      }
    }
    if (!found) {
      clog(
        "RENDER_SCAN",
        "No active renderScreen found, clearing activeScreen",
      );
    }
    setActiveScreen(null);
  }, [messages]);

  /** Find a pending renderScreen tool call directly from messages (bypasses activeScreen state timing) */
  const findPendingRenderScreen = () => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-renderScreen" &&
          "toolCallId" in part &&
          "state" in part &&
          part.state === "input-available" &&
          !submittedToolCalls.current.has(
            (part as { toolCallId: string }).toolCallId,
          )
        ) {
          return (part as { toolCallId: string }).toolCallId;
        }
      }
    }
    return null;
  };

  const submitToolOutput = (toolCallId: string, value: string) => {
    clog("TOOL_OUTPUT", `Submitting: toolCallId=${toolCallId} value="${value}"`);
    streamingTTS.stop();
    submittedToolCalls.current.add(toolCallId);
    try {
      void addToolOutput({
        tool: "renderScreen",
        toolCallId: toolCallId,
        output: value,
      });
    } catch (err) {
      clog("TOOL_OUTPUT", "Error submitting tool output:", err);
    }
    setActiveScreen(null);
  };

  const handleRenderScreenSubmit = (value: string) => {
    // Try activeScreen first, fall back to scanning messages directly
    const toolCallId = activeScreen?.toolCallId ?? findPendingRenderScreen();
    clog(
      "RENDER_SUBMIT",
      `value="${value}" toolCallId=${toolCallId} activeScreen=${!!activeScreen}`,
    );
    if (!toolCallId) {
      clog("RENDER_SUBMIT", "No pending renderScreen found, ignoring");
      return;
    }
    submitToolOutput(toolCallId, value);
  };

  const startRecording = async () => {
    // Stop any active streaming TTS
    streamingTTS.stop();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        // Convert to base64
        const buffer = await audioBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ""),
        );

        // Transcribe
        setIsTranscribing(true);
        try {
          const res = await fetch("/api/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "transcribe", audio: base64 }),
          });
          if (!res.ok) {
            clog("VOICE", `Transcription error (${res.status})`);
            return;
          }
          const data = (await res.json()) as { text?: string };
          if (data.text?.trim()) {
            sentViaMicRef.current = true;
            void sendMessage({ text: data.text });
          }
        } catch (err) {
          clog("VOICE", "Transcription failed:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      clog("VOICE", "Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const playTTS = async (text: string) => {
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "speak", text }),
      });
      if (!res.ok) {
        clog("TTS", `Speech error (${res.status})`);
        return;
      }
      const data = (await res.json()) as { audio?: string; mediaType?: string };
      if (data.audio && data.mediaType) {
        const audio = new Audio(`data:${data.mediaType};base64,${data.audio}`);
        await audio.play();
      }
    } catch (err) {
      clog("TTS", "Playback failed:", err);
    }
  };

  return (
    <div
      className="flex h-screen bg-[#F7F7F5] text-[#141414]"
      style={{ colorScheme: "light" }}
    >
      {/* browser iframe area — show credits message */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[#F7F7F5]">
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <span className="text-5xl">🌊</span>
          <h2 className="mt-4 font-[family-name:var(--font-syne)] text-2xl font-bold text-[#141414]">
            Sorry, we ran out of credits
          </h2>
          <p className="mt-2 max-w-md text-base text-[#4A4A48]">
            SimpleSurf is currently unavailable. Please check back later.
          </p>
          <Link
            href="/browse"
            className="mt-6 rounded-full bg-[#141414] px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0077B6]"
          >
            Go back
          </Link>
        </div>
      </div>

      {/* chat panel — credits exhausted */}
      <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-[#141414]/[0.06] bg-[#F7F7F5]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#141414]/[0.06] px-5 py-4">
          <span className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-tight text-[#141414] lowercase">
            simplesurf 🌊
          </span>
          <Link
            href="/browse"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A48] transition-colors hover:bg-[#141414]/[0.06] hover:text-[#141414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
            aria-label="Chat history"
            title="Chat history"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-base font-medium text-[#141414]">
            Sorry, we ran out of credits.
          </p>
          <p className="mt-2 text-sm text-[#4A4A48]">
            Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
}

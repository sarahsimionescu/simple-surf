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
      const wasMic = sentViaMicRef.current;
      sentViaMicRef.current = false;

      if (streamingTTS.isActive()) {
        // Streaming TTS worked, just flush
        streamingTTS.finish();
      } else if (wasMic) {
        // Streaming TTS failed to connect, fall back to batch TTS
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) {
          const textParts = lastAssistant.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ");
          if (textParts.trim()) void playTTS(textParts);
        }
      }
    }
  }, [status, streamingTTS, messages]);

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

  const handleRenderScreenSubmit = (value: string) => {
    clog(
      "RENDER_SUBMIT",
      `value="${value}" activeScreen=${JSON.stringify(activeScreen)}`,
    );
    if (!activeScreen) {
      clog("RENDER_SUBMIT", "No active screen, ignoring");
      return;
    }
    clog(
      "RENDER_SUBMIT",
      `Submitting tool output: toolCallId=${activeScreen.toolCallId}`,
    );
    submittedToolCalls.current.add(activeScreen.toolCallId);
    void addToolOutput({
      tool: "renderScreen",
      toolCallId: activeScreen.toolCallId,
      output: value,
    });
    setActiveScreen(null);
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
      {/* browser iframe + render screen overlay */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-[#F7F7F5]">
        {browserLiveUrl && (
          <iframe
            src={browserLiveUrl}
            className="h-full w-full border-0"
            title="Browser View"
            allow="clipboard-read; clipboard-write"
          />
        )}

        {/* Render screen overlay */}
        {activeScreen && activeScreen.type !== "auth" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F7F7F5]/90 backdrop-blur-sm">
            <div className="w-full max-w-xl">
              <RenderScreen
                type={activeScreen.type}
                prompt={activeScreen.prompt}
                options={activeScreen.options}
                onSubmit={handleRenderScreenSubmit}
              />
            </div>
          </div>
        )}

        {activeScreen?.type === "auth" && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center px-6 py-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <span className="text-[15px] font-medium text-[#141414]">
                Log in using the browser above, then click:
              </span>
              <button
                onClick={() =>
                  handleRenderScreenSubmit("User completed authentication")
                }
                className="cursor-pointer rounded-full bg-[#141414] px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0077B6]"
              >
                I&apos;m Done Logging In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* chat panel */}
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

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col gap-5">
            {isNew && messages.length === 0 && !isLoading && (
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <p className="text-xs font-medium tracking-widest text-[#9A9A97] uppercase">
                  try something like
                </p>
                {[
                  "What's the weather like today?",
                  "Find coffee shops nearby",
                  "Look up today's top news",
                  "Search for easy dinner recipes",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void sendMessage({ text: suggestion })}
                    className="cursor-pointer rounded-xl border border-[#141414]/[0.06] bg-white px-4 py-3 text-left text-[14px] text-[#4A4A48] transition-all duration-200 hover:border-[#0077B6]/30 hover:text-[#141414]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1">
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    const isUser = message.role === "user";
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                            isUser
                              ? "rounded-br-md bg-[#141414] text-white"
                              : "rounded-bl-md bg-white text-[#141414]"
                          }`}
                        >
                          <FormattedText text={part.text} />
                        </div>
                        {!isUser && part.text.trim() && (
                          <button
                            type="button"
                            onClick={() => void playTTS(part.text)}
                            className="ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center self-end rounded text-[#9A9A97] opacity-0 transition-opacity hover:text-[#4A4A48] group-hover:opacity-100"
                            aria-label="Read aloud"
                            title="Read aloud"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M11 5L6 9H2v6h4l5 4V5Z" fill="currentColor" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (
                    part.type.startsWith("tool-") &&
                    "state" in part &&
                    "toolCallId" in part
                  ) {
                    const isRenderScreen = part.type === "tool-renderScreen";
                    const isWebSearch = part.type === "tool-webSearch";

                    if (part.state === "input-available") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex items-center gap-2 py-1 text-[13px] text-[#4A4A48]"
                        >
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A4A48]" />
                          {isRenderScreen
                            ? "Needs your input, check the screen on the left"
                            : isWebSearch
                              ? "Searching the web..."
                              : "Browsing..."}
                        </div>
                      );
                    }

                    // show completed tool calls as compact indicators
                    if (part.state === "output-available") {
                      const toolName = part.type.replace("tool-", "");

                      // Show renderScreen answer inline
                      if (toolName === "renderScreen" && "output" in part) {
                        const answer = part.output as string;
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="flex items-center gap-2 py-1 text-[13px] text-[#9A9A97]"
                          >
                            <span className="text-[11px]">✓</span>
                            Question answered:{" "}
                            <span className="text-[#141414]">{answer}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex items-center gap-2 py-1 text-[13px] text-[#9A9A97]"
                        >
                          <span className="text-[11px]">✓</span>
                          {toolName === "webSearch"
                            ? "Searched the web"
                            : toolName === "browse"
                              ? "Browsed"
                              : toolName === "recordTask"
                                ? "Noted"
                                : toolName}
                        </div>
                      );
                    }
                  }

                  return null;
                })}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 py-1 text-[13px] text-[#4A4A48]">
                <PulsingDots />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            clog(
              "SEND",
              `Submit pressed. input="${input.trim()}" isLoading=${isLoading} status=${status} activeScreen=${!!activeScreen}`,
            );
            if (!input.trim()) {
              clog("SEND", "Blocked: empty");
              return;
            }
            // If renderScreen is active, submit user's text as the tool output instead
            if (activeScreen) {
              clog(
                "SEND",
                `RenderScreen active — submitting user text as tool output: "${input}"`,
              );
              handleRenderScreenSubmit(input);
              setInput("");
              return;
            }
            clog("SEND", `Calling sendMessage with text="${input}"`);
            void sendMessage({ text: input });
            setInput("");
          }}
          className="border-t border-[#141414]/[0.06] p-4"
        >
          <div className="flex items-end gap-2 rounded-xl border border-[#141414]/10 bg-[#F7F7F5] px-4 py-2 transition-colors focus-within:border-[#0077B6]">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  clog(
                    "SEND:ENTER",
                    `Enter pressed. input="${input.trim()}" isLoading=${isLoading} status=${status} activeScreen=${!!activeScreen}`,
                  );
                  if (!input.trim()) {
                    clog("SEND:ENTER", "Blocked: empty");
                    return;
                  }
                  // If renderScreen is active, submit user's text as the tool output instead
                  if (activeScreen) {
                    clog(
                      "SEND:ENTER",
                      `RenderScreen active — submitting user text as tool output: "${input}"`,
                    );
                    handleRenderScreenSubmit(input);
                    setInput("");
                    e.currentTarget.style.height = "auto";
                    return;
                  }
                  if (isLoading) {
                    clog("SEND:ENTER", "Blocked: still loading");
                    return;
                  }
                  clog(
                    "SEND:ENTER",
                    `Calling sendMessage with text="${input}"`,
                  );
                  void sendMessage({ text: input });
                  setInput("");
                  e.currentTarget.style.height = "auto";
                }
              }}
              placeholder="What would you like to do?"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-[#141414] placeholder:text-[#9A9A97] focus:outline-none"
              disabled={isLoading && !activeScreen}
            />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                void startRecording();
              }}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              disabled={isLoading || isTranscribing}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6] disabled:opacity-30 ${
                isRecording
                  ? "bg-red-500 text-white"
                  : "bg-[#141414]/[0.06] text-[#4A4A48] hover:bg-[#141414]/10"
              }`}
              aria-label={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Hold to talk"}
              title={isRecording ? "Release to send" : "Hold to talk"}
            >
              {isTranscribing ? (
                <PulsingDots />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z"
                    fill={isRecording ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M19 10v2a7 7 0 0 1-14 0v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button
              type="submit"
              disabled={(isLoading && !activeScreen) || !input.trim()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#141414] text-white transition-all duration-200 hover:bg-[#0077B6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6] disabled:opacity-30"
              aria-label="Send message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

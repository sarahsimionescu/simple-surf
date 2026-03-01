"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { RenderScreen } from "~/app/_components/render-screen";

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
  const lines = text.split("\n");
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
        level === 1 ? "text-lg font-bold" : level === 2 ? "text-base font-bold" : "text-[15px] font-semibold";
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
  browserLiveUrl,
  initialMessages = [],
  isNew = false,
}: {
  conversationId: string;
  browserLiveUrl: string | null;
  initialMessages?: import("ai").UIMessage[];
  isNew?: boolean;
}) {
  const [input, setInput] = useState("");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen | null>(null);
  const submittedToolCalls = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const { messages, sendMessage, addToolOutput, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // scan messages for active renderScreen tool calls
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type.startsWith("tool-") &&
          "toolCallId" in part &&
          "state" in part &&
          part.state === "input-available" &&
          !submittedToolCalls.current.has((part as { toolCallId: string }).toolCallId)
        ) {
          if (part.type === "tool-renderScreen" && "input" in part) {
            const toolInput = part.input as {
              type: "select-one" | "select-multi" | "text" | "auth";
              prompt: string;
              options?: string[];
            };
            setActiveScreen({
              type: toolInput.type,
              prompt: toolInput.prompt,
              options: toolInput.options,
              toolCallId: (part as { toolCallId: string }).toolCallId,
            });
            return;
          }
        }
      }
    }
    setActiveScreen(null);
  }, [messages]);

  const handleRenderScreenSubmit = (value: string) => {
    if (!activeScreen) return;
    submittedToolCalls.current.add(activeScreen.toolCallId);
    void addToolOutput({
      tool: "renderScreen",
      toolCallId: activeScreen.toolCallId,
      output: value,
    });
    setActiveScreen(null);
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

        {activeScreen && activeScreen.type === "auth" && (
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center px-6 py-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
              <span className="text-[15px] font-medium text-[#141414]">
                Log in using the browser above, then click:
              </span>
              <button
                onClick={() => handleRenderScreenSubmit("User completed authentication")}
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
          <span className="font-[family-name:var(--font-syne)] text-sm font-bold lowercase tracking-tight text-[#141414]">
            simplesurf 🌊
          </span>
          <a
            href="/browse"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A48] transition-colors hover:bg-[#141414]/[0.06] hover:text-[#141414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
            aria-label="Chat history"
            title="Chat history"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </a>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col gap-5">
            {isNew && messages.length === 0 && !isLoading && (
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <p className="text-xs font-medium uppercase tracking-widest text-[#9A9A97]">
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
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
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
                    // hide tool outputs — the text response covers it
                    if (part.state === "output-available") {
                      return null;
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
            if (!input.trim()) return;
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
                  if (!input.trim() || isLoading) return;
                  void sendMessage({ text: input });
                  setInput("");
                  e.currentTarget.style.height = "auto";
                }
              }}
              placeholder="What would you like to do?"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed text-[#141414] placeholder:text-[#9A9A97] focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#141414] text-white transition-all duration-200 hover:bg-[#0077B6] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
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

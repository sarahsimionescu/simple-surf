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

// renders markdown-like text: **bold**, *italic*, `code`, and newlines
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\n)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
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

export function BrowseSession({
  conversationId,
  browserLiveUrl,
}: {
  conversationId: string;
  browserLiveUrl: string | null;
}) {
  const [input, setInput] = useState("");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, addToolOutput, status } = useChat({
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
          "input" in part
        ) {
          const toolInput = part.input as {
            type: "select-one" | "select-multi" | "text" | "auth";
            prompt: string;
            options?: string[];
          };
          if (part.type === "tool-renderScreen") {
            setActiveScreen({
              type: toolInput.type,
              prompt: toolInput.prompt,
              options: toolInput.options,
              toolCallId: part.toolCallId,
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
      <div className="relative flex-[3]">
        {browserLiveUrl && (
          <iframe
            src={browserLiveUrl}
            className="h-full w-full border-0"
            title="Browser View"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}

        {activeScreen && (
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
      </div>

      {/* chat panel */}
      <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-[#141414]/[0.06] bg-[#F7F7F5]">
        {/* header */}
        <div className="flex items-center border-b border-[#141414]/[0.06] px-5 py-4">
          <span className="font-[family-name:var(--font-syne)] text-sm font-bold lowercase tracking-tight text-[#141414]">
            simplesurf
          </span>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col gap-5">
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

                    if (part.state === "input-available") {
                      // only show status for renderScreen (user action needed)
                      // other tools are just the AI working in the browser
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="flex items-center gap-2 py-1 text-[13px] text-[#4A4A48]"
                        >
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4A4A48]" />
                          {isRenderScreen
                            ? "Needs your input — check the screen on the left"
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

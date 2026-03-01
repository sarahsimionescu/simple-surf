"use client";

import { useState, useEffect } from "react";
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

export function BrowseSession({
  conversationId,
  browserLiveUrl,
}: {
  conversationId: string;
  browserLiveUrl: string | null;
}) {
  const [input, setInput] = useState("");
  const [activeScreen, setActiveScreen] = useState<ActiveScreen | null>(null);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "streaming" || status === "submitted";

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
      <div className="flex h-full flex-[2] flex-col border-l border-[#141414]/10 bg-white">
        {/* messages */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${
                          message.role === "user"
                            ? "ml-auto max-w-[80%] bg-[#141414] text-[#F7F7F5]"
                            : "mr-auto max-w-[80%] bg-[#F7F7F5] text-[#141414]"
                        }`}
                      >
                        {part.text}
                      </div>
                    );
                  }

                  if (
                    part.type.startsWith("tool-") &&
                    "state" in part &&
                    "toolCallId" in part
                  ) {
                    if (part.state === "input-available") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mr-auto max-w-[80%] rounded-2xl bg-[#0077B6]/10 px-4 py-3 text-base italic text-[#0077B6]"
                        >
                          Waiting for your response...
                        </div>
                      );
                    }
                    if (part.state === "output-available") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="ml-auto max-w-[80%] rounded-2xl bg-[#141414]/80 px-4 py-3 text-base text-[#F7F7F5]"
                        >
                          {String((part as { output: unknown }).output)}
                        </div>
                      );
                    }
                  }

                  return null;
                })}
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto max-w-[80%] rounded-2xl bg-[#F7F7F5] px-4 py-3 text-base text-[#4A4A48]">
                Thinking...
              </div>
            )}
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
          className="border-t border-[#141414]/10 p-4"
        >
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to do?"
              className="flex-1 rounded-xl border border-[#141414]/10 bg-[#F7F7F5] px-4 py-3 text-base text-[#141414] placeholder:text-[#9A9A97] focus:border-[#0077B6] focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="cursor-pointer rounded-xl bg-[#141414] px-6 py-3 text-base font-semibold text-[#F7F7F5] transition-all duration-300 hover:bg-[#0077B6] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

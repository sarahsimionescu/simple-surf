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

  // Scan messages for active renderScreen tool calls
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
          // Check if this is a renderScreen tool by checking part.type
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
    <div className="flex h-screen">
      {/* Main content: browser iframe + render screen overlay */}
      <div className="relative flex-[3]">
        {browserLiveUrl && (
          <iframe
            src={browserLiveUrl}
            className="h-full w-full border-0"
            title="Browser View"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}

        {/* Render screen overlay */}
        {activeScreen && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
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

      {/* Chat panel */}
      <div className="flex h-full flex-[2] flex-col border-l">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={`${message.id}-${i}`}
                        className={`rounded-2xl px-4 py-3 text-lg ${
                          message.role === "user"
                            ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                            : "mr-auto max-w-[80%] bg-muted"
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
                          className="mr-auto max-w-[80%] rounded-2xl bg-accent px-4 py-3 text-lg italic text-muted-foreground"
                        >
                          Waiting for your response...
                        </div>
                      );
                    }
                    if (part.state === "output-available") {
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="ml-auto max-w-[80%] rounded-2xl bg-primary/80 px-4 py-3 text-lg text-primary-foreground"
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
              <div className="mr-auto max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-lg text-muted-foreground">
                Thinking...
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void sendMessage({ text: input });
            setInput("");
          }}
          className="border-t p-4"
        >
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like to do?"
              className="flex-1 rounded-xl border-2 border-input bg-background px-4 py-3 text-lg focus:border-primary focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

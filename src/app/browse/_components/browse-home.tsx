"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { ArrowIcon } from "~/app/_components/arrow-icon";

interface Conversation {
  id: string;
  title: string | null;
  lastVisitedUrl: string | null;
  lastScreenshotUrl: string | null;
  createdAt: Date;
}

export function BrowseHome({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const createConversation = api.conversation.create.useMutation({
    onSuccess: (data) => {
      setIsNavigating(true);
      router.push(`/browse/${data.id}`);
    },
  });

  const isStarting = createConversation.isPending || isNavigating;

  return (
    <main
      className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#141414]"
      style={{ colorScheme: "light" }}
    >
      {/* nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <span className="font-[family-name:var(--font-syne)] text-lg font-bold lowercase tracking-tight">
          simplesurf 🌊
        </span>
        <div className="flex items-center gap-4">
          <a
            href="/browse/settings"
            className="text-base font-medium text-[#4A4A48] transition-colors duration-200 hover:text-[#141414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
          >
            Settings
          </a>
          <button
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            className="text-base font-medium text-[#4A4A48] transition-colors duration-200 hover:text-[#141414]"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* hero */}
      <div className="flex flex-col items-center px-6 pt-[18vh]">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold lowercase tracking-tight md:text-4xl">
          what can we help you with?
        </h1>
        <p className="mt-3 text-lg text-[#4A4A48]">
          Start a new conversation and we'll browse the web for you.
        </p>
        <button
          onClick={() => createConversation.mutate({})}
          disabled={isStarting}
          className="btn-shine group mt-8 cursor-pointer rounded-full bg-[#141414] px-10 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-300 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
        >
          <span className="flex items-center gap-3">
            {isStarting ? "Starting..." : "New conversation"}
            {!isStarting && <ArrowIcon />}
          </span>
        </button>

        {/* conversation history */}
        {conversations.length > 0 && (
          <div className="mt-16 w-full max-w-4xl pb-16">
            <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.15em] text-[#9A9A97]">
              Pick up where you left off
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/browse/${c.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-[#141414]/[0.06] bg-white text-left transition-all duration-200 hover:border-[#0077B6]/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
                >
                  {/* screenshot thumbnail */}
                  <div className="aspect-[16/10] w-full overflow-hidden bg-[#EDEDEB]">
                    {c.lastScreenshotUrl ? (
                      <img
                        src={c.lastScreenshotUrl}
                        alt=""
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#9A9A97]">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
                          <path d="M3 16l5-4 3 3 4-5 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* label */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="block truncate text-sm font-medium text-[#141414]">
                      {c.lastVisitedUrl
                        ? c.lastVisitedUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
                        : c.title ?? "Untitled"}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className="ml-2 shrink-0 text-[#9A9A97] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#0077B6]"
                    >
                      <path
                        d="M6 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

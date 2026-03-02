"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";
import Image from "next/image";
import Link from "next/link";

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
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);

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
          <Link
            href="/browse/settings"
            className="text-base font-medium text-[#4A4A48] underline-offset-4 transition-colors duration-200 hover:text-[#141414] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
          >
            Settings
          </Link>
          <button
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            className="cursor-pointer text-base font-medium text-[#4A4A48] underline-offset-4 transition-colors duration-200 hover:text-[#141414] hover:underline"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* hero */}
      <div className="flex flex-col items-center px-6 pt-[18vh]">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold lowercase tracking-tight md:text-4xl">
          sorry, we ran out of credits
        </h1>
        <p className="mt-3 text-lg text-[#4A4A48]">
          SimpleSurf is currently unavailable. Please check back later.
        </p>
        <button
          disabled
          className="btn-shine group mt-8 cursor-not-allowed rounded-full bg-[#141414] px-10 py-5 text-lg font-semibold text-[#F7F7F5] opacity-50"
        >
          <span className="flex items-center gap-3">
            New conversation
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
                  onClick={() => {
                    setLoadingConversationId(c.id);
                    router.push(`/browse/${c.id}`);
                  }}
                  disabled={loadingConversationId === c.id}
                  className="group cursor-pointer overflow-hidden rounded-xl border border-[#141414]/[0.06] bg-white text-left transition-all duration-200 hover:border-[#0077B6]/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
                >
                  {/* screenshot thumbnail */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EDEDEB]">
                    {c.lastScreenshotUrl ? (
                      <Image
                        src={c.lastScreenshotUrl}
                        alt=""
                        fill
                        className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
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
                    {loadingConversationId === c.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <svg className="h-6 w-6 animate-spin text-[#0077B6]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
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

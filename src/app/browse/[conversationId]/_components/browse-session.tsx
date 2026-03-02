"use client";

import type { UIMessage } from "ai";
import Link from "next/link";

export function BrowseSession({
  conversationId: _conversationId,
  browserSessionId: _browserSessionId,
  browserLiveUrl: _browserLiveUrl,
  initialMessages: _initialMessages = [],
  isNew: _isNew = false,
}: {
  conversationId: string;
  browserSessionId: string;
  browserLiveUrl: string | null;
  initialMessages?: UIMessage[];
  isNew?: boolean;
}) {
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

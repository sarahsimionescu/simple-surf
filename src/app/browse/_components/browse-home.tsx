"use client";

import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";
import { ArrowIcon } from "~/app/_components/arrow-icon";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
}

export function BrowseHome({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const router = useRouter();
  const createConversation = api.conversation.create.useMutation({
    onSuccess: (data) => {
      router.push(`/browse/${data.id}`);
    },
  });

  return (
    <main
      className="min-h-screen bg-[#F7F7F5] text-[#141414]"
      style={{ colorScheme: "light" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        {/* header */}
        <div className="mb-12 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold lowercase tracking-tight">
            simplesurf 🌊
          </h1>
          <button
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            className="text-sm text-[#4A4A48] underline"
          >
            Sign Out
          </button>
        </div>

        {/* new conversation */}
        <div className="mb-16">
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold lowercase text-[#141414]">
            what can we help you with?
          </h2>
          <p className="mt-2 text-lg text-[#4A4A48]">
            Tell us what you need and we'll browse the web for you.
          </p>
          <button
            onClick={() => createConversation.mutate({})}
            disabled={createConversation.isPending}
            className="group mt-6 cursor-pointer rounded-full bg-[#141414] px-8 py-4 text-lg font-semibold text-[#F7F7F5] transition-all duration-300 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
          >
            <span className="flex items-center gap-3">
              {createConversation.isPending ? "Starting..." : "New conversation"}
              {!createConversation.isPending && <ArrowIcon />}
            </span>
          </button>
        </div>

        {/* conversation history */}
        {conversations.length > 0 && (
          <div>
            <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.15em] text-[#4A4A48]">
              Your conversations
            </h2>
            <div className="flex flex-col gap-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/browse/${c.id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#141414]/[0.06] bg-white px-5 py-4 text-left transition-all duration-200 hover:border-[#0077B6]/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
                >
                  <span className="text-base font-medium text-[#141414]">
                    {c.title ?? "Untitled"}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 text-[#9A9A97] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#0077B6]"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

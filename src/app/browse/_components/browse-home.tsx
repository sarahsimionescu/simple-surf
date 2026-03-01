"use client";

import { useRouter } from "next/navigation";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

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
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-[#F7F7F5] p-8 text-[#141414]"
      style={{ colorScheme: "light" }}
    >
      <button
        onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
        className="absolute right-8 top-8 text-sm text-muted-foreground underline"
      >
        Sign Out
      </button>
      <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold lowercase tracking-tight">
        simplesurf
      </h1>
      <p className="max-w-md text-center text-lg text-[#4A4A48]">
        Your friendly browsing assistant. Start a new conversation to browse the
        web with help.
      </p>

      <button
        onClick={() => createConversation.mutate({})}
        disabled={createConversation.isPending}
        className="cursor-pointer rounded-full bg-[#141414] px-10 py-4 text-lg font-semibold text-[#F7F7F5] transition-all duration-300 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
      >
        {createConversation.isPending ? "Starting..." : "Start Browsing"}
      </button>

      {conversations.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-lg font-bold lowercase text-[#4A4A48]">
            recent conversations
          </h2>
          <div className="flex flex-col gap-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/browse/${c.id}`)}
                className="cursor-pointer rounded-xl border border-[#141414]/10 bg-white px-5 py-4 text-left text-base transition-all duration-200 hover:border-[#0077B6]/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
              >
                {c.title ?? "Untitled"}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <button
        onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
        className="absolute right-8 top-8 text-sm text-muted-foreground underline"
      >
        Sign Out
      </button>
      <h1 className="text-4xl font-bold">SimpleSurf</h1>
      <p className="max-w-md text-center text-xl text-muted-foreground">
        Your friendly browsing assistant. Start a new conversation to browse the
        web with help.
      </p>

      <button
        onClick={() => createConversation.mutate({})}
        disabled={createConversation.isPending}
        className="rounded-xl bg-primary px-8 py-4 text-xl font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {createConversation.isPending ? "Starting..." : "Start Browsing"}
      </button>

      {conversations.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="mb-4 text-xl font-semibold">Recent Conversations</h2>
          <div className="flex flex-col gap-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/browse/${c.id}`)}
                className="rounded-xl border-2 border-border bg-card px-4 py-3 text-left text-lg transition-colors hover:border-primary/40"
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

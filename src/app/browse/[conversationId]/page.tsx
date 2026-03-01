import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { BrowseSession } from "./_components/browse-session";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  const { conversationId } = await params;
  const conversation = await api.conversation.get({ id: conversationId });

  return (
    <BrowseSession
      conversationId={conversation.id}
      browserLiveUrl={conversation.browserLiveUrl}
    />
  );
}

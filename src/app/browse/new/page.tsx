import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function NewBrowsePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const conversation = await api.conversation.create({});
  redirect(`/browse/${conversation.id}`);
}

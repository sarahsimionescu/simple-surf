import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";

export default async function NewBrowsePage() {
  const session = await getSession();
  if (!session) redirect("/");

  // Credits exhausted — redirect to browse home
  redirect("/browse");
}

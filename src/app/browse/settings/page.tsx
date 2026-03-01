import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { MemoryGraphView } from "./_components/memory-graph-view";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <main
      className="flex min-h-screen flex-col bg-[#F7F7F5] text-[#141414]"
      style={{ colorScheme: "light" }}
    >
      {/* nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <a
          href="/browse"
          className="font-[family-name:var(--font-syne)] text-lg font-bold lowercase tracking-tight transition-opacity hover:opacity-70"
        >
          simplesurf 🌊
        </a>
        <a
          href="/browse"
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium text-[#4A4A48] ring-1 ring-[#141414]/10 transition-all duration-200 hover:bg-[#141414] hover:text-[#F7F7F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]"
        >
          Back to conversations
        </a>
      </nav>

      {/* content */}
      <div className="flex flex-1 flex-col px-8 pb-8">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold lowercase tracking-tight">
            your memory
          </h1>
          <p className="mt-1 text-base text-[#4A4A48]">
            Everything SimpleSurf remembers from your conversations.
          </p>
        </div>
        <div className="flex-1">
          <MemoryGraphView />
        </div>
      </div>
    </main>
  );
}

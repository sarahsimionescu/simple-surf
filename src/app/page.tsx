import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { SignInButton } from "~/app/_components/sign-in-button";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/browse");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold">SimpleSurf</h1>
      <p className="max-w-md text-center text-xl text-muted-foreground">
        A friendly browsing assistant that helps you navigate the web with ease.
      </p>
      <SignInButton />
    </main>
  );
}

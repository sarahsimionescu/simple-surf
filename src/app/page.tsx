import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

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
      <form>
        <button
          className="rounded-xl bg-primary px-8 py-4 text-xl font-semibold text-primary-foreground"
          formAction={async () => {
            "use server";
            const res = await auth.api.signInSocial({
              body: {
                provider: "google",
                callbackURL: "/browse",
              },
            });
            if (!res.url) {
              throw new Error("No URL returned from signInSocial");
            }
            redirect(res.url);
          }}
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}

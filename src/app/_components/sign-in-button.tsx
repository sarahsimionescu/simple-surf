"use client";

import { authClient } from "~/server/better-auth/client";

export function SignInButton() {
  return (
    <button
      className="rounded-xl bg-primary px-8 py-4 text-xl font-semibold text-primary-foreground"
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/browse",
        })
      }
    >
      Sign in with Google
    </button>
  );
}

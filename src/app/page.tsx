import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { SignInButton } from "~/app/_components/sign-in-button";
import { GrainOverlay } from "~/app/_components/grain-overlay";
import { LandingHero } from "~/app/_components/landing-hero";
import { LandingSteps } from "~/app/_components/landing-steps";
import { LandingCta } from "~/app/_components/landing-cta";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/browse");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7F5] text-[#141414] selection:bg-[#0077B6]/20" style={{ colorScheme: "light" }}>
      {/* skip to content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#141414] focus:px-4 focus:py-3 focus:text-[#F7F7F5] focus:text-base focus:font-medium"
      >
        Skip to main content
      </a>

      <GrainOverlay />

      {/* nav */}
      <nav
        aria-label="Main navigation"
        className="landing-reveal fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-8 py-5 backdrop-blur-md bg-[#F7F7F5]/70"
      >
        <span className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight lowercase">
          simplesurf
        </span>
        <SignInButton className="cursor-pointer rounded-full bg-transparent px-6 py-3 text-base font-semibold text-[#141414] ring-1 ring-[#141414]/20 transition-all duration-300 hover:bg-[#141414] hover:text-[#F7F7F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
          Sign in
        </SignInButton>
      </nav>

      <main id="main">
        <LandingHero />

        {/* product screenshot placeholder */}
        <section className="px-6 pt-16 pb-32 md:pt-24 md:pb-40">
          <div className="mx-auto max-w-6xl">
            <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-[#141414]/[0.06] bg-white shadow-[0_4px_60px_rgba(0,0,0,0.06)] md:rounded-3xl">
              <span className="text-sm text-[#9A9A97]">
                product screenshot
              </span>
            </div>
          </div>
        </section>

        <LandingSteps />

        {/* divider */}
        <div aria-hidden="true" className="mx-auto max-w-5xl px-6">
          <div className="h-px bg-[#141414]/[0.06]" />
        </div>

        <LandingCta />
      </main>

      {/* footer */}
      <footer className="px-8 py-10 text-center">
        <span className="font-[family-name:var(--font-syne)] text-sm lowercase tracking-[0.1em] text-[#737370]">
          simplesurf &copy; 2026
        </span>
      </footer>
    </div>
  );
}

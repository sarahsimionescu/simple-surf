import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { SignInButton } from "~/app/_components/sign-in-button";

const steps = [
  {
    title: "Describe what you need",
    description:
      'Type a simple request like "Find me a recipe for banana bread." No special words needed — just say it like you would to a friend.',
  },
  {
    title: "We browse for you",
    description:
      "SimpleSurf opens a browser and does the searching, clicking, and typing. You can watch everything it does on your screen.",
  },
  {
    title: "You stay in control",
    description:
      "Nothing happens without you seeing it first. If we need a decision, we'll ask. You can stop at any time.",
  },
];

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/browse");
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#141414] selection:bg-[#0077B6]/20">
      {/* skip to content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#141414] focus:px-4 focus:py-3 focus:text-[#F7F7F5] focus:text-base focus:font-medium"
      >
        Skip to main content
      </a>

      {/* grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

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

      {/* hero */}
      <main id="main">
        <section
          aria-labelledby="hero-heading"
          className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20"
        >
          <div className="max-w-5xl text-center">
            <h1
              id="hero-heading"
              className="landing-reveal font-[family-name:var(--font-syne)] text-[clamp(3.5rem,12vw,11rem)] font-extrabold leading-[0.9] tracking-[-0.02em]"
            >
              the internet,
              <br />
              <span className="text-[#0077B6]">made easy</span>
              <span className="text-[#0077B6]/40">.</span>
            </h1>
            <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-8 max-w-lg text-lg leading-relaxed text-[#4A4A48] md:text-xl">
              SimpleSurf browses the web for you. Just describe what
              you&apos;re looking for — no computer skills needed.
            </p>
            <div className="landing-reveal landing-reveal-delay-2 mt-12 flex flex-col items-center gap-3">
              <SignInButton className="group relative cursor-pointer rounded-full bg-[#141414] px-12 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-500 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
                <span className="flex items-center gap-3">
                  Get started — it&apos;s free
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </SignInButton>
              <span className="text-sm text-[#4A4A48]">
                Uses your Google account — no new password needed.
              </span>
            </div>
          </div>

          {/* scroll cue */}
          <div
            aria-hidden="true"
            className="landing-reveal landing-reveal-delay-3 absolute bottom-10 flex flex-col items-center gap-3"
          >
            <span className="text-sm tracking-wide text-[#4A4A48]">
              Scroll down to learn more
            </span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="animate-bounce"
            >
              <path
                d="M10 4v12M5 11l5 5 5-5"
                stroke="#4A4A48"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* features */}
        <section
          aria-labelledby="features-heading"
          className="px-6 py-32 md:py-40"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-20 text-center">
              <h2
                id="features-heading"
                className="font-[family-name:var(--font-syne)] text-sm font-bold uppercase tracking-[0.15em] text-[#4A4A48]"
              >
                How it works
              </h2>
            </div>
            <div className="grid gap-16 md:grid-cols-3 md:gap-12">
              {features.map((feature, i) => (
                <div key={i} className="group">
                  <span
                    aria-hidden="true"
                    className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-widest text-[#0077B6]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    aria-hidden="true"
                    className="mt-4 mb-4 h-px w-8 bg-[#141414]/10 transition-all duration-500 group-hover:w-full group-hover:bg-[#0077B6]/40"
                  />
                  <h3 className="font-[family-name:var(--font-syne)] text-2xl font-bold leading-tight md:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-[#4A4A48]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* divider */}
        <div aria-hidden="true" className="mx-auto max-w-5xl px-6">
          <div className="h-px bg-[#141414]/[0.06]" />
        </div>

        {/* bottom cta */}
        <section
          aria-labelledby="cta-heading"
          className="px-6 py-32 text-center md:py-40"
        >
          <h2
            id="cta-heading"
            className="font-[family-name:var(--font-syne)] text-4xl font-extrabold tracking-[-0.02em] md:text-6xl lg:text-7xl"
          >
            ready to{" "}
            <span className="text-[#0077B6]">surf</span>
            <span className="text-[#0077B6]/40">?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-sm text-base text-[#4A4A48]">
            Free to use. Just sign in with your Google account to get started.
          </p>
          <div className="mt-10">
            <SignInButton className="group cursor-pointer rounded-full bg-[#141414] px-12 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-500 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
              <span className="flex items-center gap-3">
                Get started
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </SignInButton>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="px-8 py-10 text-center">
        <span className="font-[family-name:var(--font-syne)] text-sm tracking-[0.1em] text-[#737370]">
          SimpleSurf &copy; 2026
        </span>
      </footer>
    </div>
  );
}

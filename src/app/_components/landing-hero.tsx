import { SignInButton } from "~/app/_components/sign-in-button";
import { ArrowIcon } from "~/app/_components/arrow-icon";

export function LandingHero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-28"
    >
      <div className="max-w-5xl text-center">
        <h1
          id="hero-heading"
          className="landing-reveal font-[family-name:var(--font-syne)] text-[clamp(2.25rem,9vw,9rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.02em]"
        >
          the internet,
          <br />
          <span className="md:whitespace-nowrap">
            <span className="text-[#0077B6]">made easy</span>
            <span className="text-[#0077B6]/40">.</span>
          </span>
        </h1>
        <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-8 max-w-lg text-lg leading-relaxed text-[#4A4A48] md:text-xl">
          SimpleSurf browses the web for you. Just describe what
          you&apos;re looking for — no computer skills needed.
        </p>
        <div className="landing-reveal landing-reveal-delay-2 mt-12 flex flex-col items-center gap-3">
          <SignInButton className="group relative cursor-pointer rounded-full bg-[#141414] px-12 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-500 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
            <span className="flex items-center gap-3">
              Get started — it&apos;s free
              <ArrowIcon />
            </span>
          </SignInButton>
        </div>
      </div>

      {/* scroll indicator */}
      <div
        aria-hidden="true"
        className="landing-reveal landing-reveal-delay-3 absolute bottom-8 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#9A9A97]">
          scroll
        </span>
        <div className="h-10 w-px animate-pulse bg-[#141414]/15" />
      </div>
    </section>
  );
}

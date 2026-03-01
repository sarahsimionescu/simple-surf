import { SignInButton } from "~/app/_components/sign-in-button";
import { ArrowIcon } from "~/app/_components/arrow-icon";
import { BounceDot } from "~/app/_components/bounce-dot";

export function LandingHero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-28"
    >
      <div className="relative max-w-5xl text-center">
        <h1
          id="hero-heading"
          className="landing-reveal font-[family-name:var(--font-syne)] text-[clamp(2.25rem,8vw,7rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.02em]"
        >
          the internet,
          <br />
          <BounceDot>
            <span className="text-[#0077B6]">made easy</span>
          </BounceDot>
        </h1>
        {/* starfish */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-[10%] top-[60%] w-[120px] rotate-[15deg] opacity-[0.8] md:w-[200px]"
          viewBox="0 0 74.86 65.33"
          fill="#E8729A"
        >
          <path d="M62.06,65.33a11.86,11.86,0,0,1-7.66-3,94.15,94.15,0,0,1-8.52-7.69c-5.52-5.73-9.7-6.12-15.82-1-2.49,2.08-4.72,4.5-7.28,6.48a35.93,35.93,0,0,1-7.23,4.44,9,9,0,0,1-5.06.39c-2.62-.5-3.28-3.13-1.41-5,1.58-1.61,3.33-3.06,4.93-4.67,3.8-3.83,5.15-8.72,5.68-13.89a6.15,6.15,0,0,0-2.83-6c-3.15-2.08-6.35-4.08-9.58-6A19.32,19.32,0,0,1,.82,23.14C0,21.79-.47,20.38.79,19s2.64-1.25,4.12-.55a9.4,9.4,0,0,1,1.51.87c5.47,3.91,11.8,5.3,18.29,6.12,4,.5,4.87,0,5.77-3.93,1.14-5,1.91-10,2.87-15a31.06,31.06,0,0,1,.89-3.54c.47-1.49,1.18-2.89,3-2.93,1.25,0,2.49,1.59,2.8,3.36q1.65,9.44,3.31,18.86c.41,2.29,1.18,3.22,3.55,3.12a69.51,69.51,0,0,0,9.64-1.17,30,30,0,0,0,11.92-4.63A6.61,6.61,0,0,1,70,18.79c1.39-.48,2.82-1,4,.43a3.67,3.67,0,0,1,.08,4.55,32.42,32.42,0,0,1-5.61,4.85c-2.89,1.93-6.09,3.38-9,5.3-6.17,4.07-7.36,9.22-3.83,15.74a17.75,17.75,0,0,0,7.22,7.59c1.49.79,2.93,1.72,3.3,3.59C66.76,63.7,65.24,65.37,62.06,65.33Z" />
        </svg>

        {/* second starfish */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -left-[8%] top-[55%] w-[60px] -rotate-[25deg] scale-x-[-1] opacity-[0.8] md:w-[100px]"
          viewBox="0 0 74.86 65.33"
          fill="#E8729A"
        >
          <path d="M62.06,65.33a11.86,11.86,0,0,1-7.66-3,94.15,94.15,0,0,1-8.52-7.69c-5.52-5.73-9.7-6.12-15.82-1-2.49,2.08-4.72,4.5-7.28,6.48a35.93,35.93,0,0,1-7.23,4.44,9,9,0,0,1-5.06.39c-2.62-.5-3.28-3.13-1.41-5,1.58-1.61,3.33-3.06,4.93-4.67,3.8-3.83,5.15-8.72,5.68-13.89a6.15,6.15,0,0,0-2.83-6c-3.15-2.08-6.35-4.08-9.58-6A19.32,19.32,0,0,1,.82,23.14C0,21.79-.47,20.38.79,19s2.64-1.25,4.12-.55a9.4,9.4,0,0,1,1.51.87c5.47,3.91,11.8,5.3,18.29,6.12,4,.5,4.87,0,5.77-3.93,1.14-5,1.91-10,2.87-15a31.06,31.06,0,0,1,.89-3.54c.47-1.49,1.18-2.89,3-2.93,1.25,0,2.49,1.59,2.8,3.36q1.65,9.44,3.31,18.86c.41,2.29,1.18,3.22,3.55,3.12a69.51,69.51,0,0,0,9.64-1.17,30,30,0,0,0,11.92-4.63A6.61,6.61,0,0,1,70,18.79c1.39-.48,2.82-1,4,.43a3.67,3.67,0,0,1,.08,4.55,32.42,32.42,0,0,1-5.61,4.85c-2.89,1.93-6.09,3.38-9,5.3-6.17,4.07-7.36,9.22-3.83,15.74a17.75,17.75,0,0,0,7.22,7.59c1.49.79,2.93,1.72,3.3,3.59C66.76,63.7,65.24,65.37,62.06,65.33Z" />
        </svg>

        <p className="landing-reveal landing-reveal-delay-1 mx-auto mt-8 max-w-lg text-xl leading-relaxed text-[#4A4A48] md:text-2xl">
          SimpleSurf browses the web for you. Just describe what
          you&apos;re looking for. No computer skills needed.
        </p>
        <div className="landing-reveal landing-reveal-delay-2 mt-12 flex flex-col items-center gap-3">
          <SignInButton className="btn-shine group relative cursor-pointer rounded-full bg-[#141414] px-12 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-500 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
            <span className="flex items-center gap-3">
              Get started, it&apos;s free
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

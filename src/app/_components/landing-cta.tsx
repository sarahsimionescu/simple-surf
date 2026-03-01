import { SignInButton } from "~/app/_components/sign-in-button";
import { ArrowIcon } from "~/app/_components/arrow-icon";

export function LandingCta() {
  return (
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
      <p className="mx-auto mt-6 max-w-md text-base text-[#4A4A48] md:text-lg">
        Free to use. Nothing to install. Works right in your browser.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <SignInButton className="group cursor-pointer rounded-full bg-[#141414] px-12 py-5 text-lg font-semibold text-[#F7F7F5] transition-all duration-500 hover:bg-[#0077B6] hover:shadow-[0_0_40px_rgba(0,119,182,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
          <span className="flex items-center gap-3">
            Sign in with Google to start
            <ArrowIcon />
          </span>
        </SignInButton>
      </div>
    </section>
  );
}

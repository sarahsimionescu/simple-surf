import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { GrainOverlay } from "~/app/_components/grain-overlay";
import { LandingNav } from "~/app/_components/landing-nav";
import { LandingHero } from "~/app/_components/landing-hero";
import { LandingMarquee } from "~/app/_components/landing-marquee";
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

      <LandingNav />

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

        <LandingMarquee />

        <LandingSteps />

        <LandingCta />
      </main>

      {/* footer with beach scene */}
      <footer className="relative overflow-hidden text-center">
        <svg
          className="block w-full"
          viewBox="0 0 1440 165"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ocean1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#29ABE2" />
              <stop offset="100%" stopColor="#0077B6" />
            </linearGradient>
            <linearGradient id="ocean2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0099DD" />
              <stop offset="100%" stopColor="#005F8C" />
            </linearGradient>
            <linearGradient id="ocean3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0088CC" />
              <stop offset="100%" stopColor="#004E73" />
            </linearGradient>
            <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2D98B" />
              <stop offset="100%" stopColor="#E8C96A" />
            </linearGradient>
            <linearGradient id="wet-sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4B87A" />
              <stop offset="100%" stopColor="#C4A862" />
            </linearGradient>
          </defs>

          {/* page bg fill behind everything */}
          <rect width="1440" height="200" fill="#F7F7F5" />
          {/* far ocean - starts lower with wavy top edge */}
          <path d="M0 30 Q240 15 480 28 Q720 40 960 25 Q1200 10 1440 22 L1440 200 L0 200 Z" fill="url(#ocean1)" />
          {/* mid wave - overlaps far ocean */}
          <path d="M0 30 Q180 15 360 35 Q540 55 720 30 Q900 5 1080 30 Q1260 55 1440 35 L1440 200 L0 200 Z" fill="url(#ocean2)" />
          {/* foam highlight */}
          <path d="M0 33 Q180 18 360 38 Q540 58 720 33 Q900 8 1080 33 Q1260 58 1440 38" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* near wave - overlaps mid */}
          <path d="M0 65 Q200 50 400 68 Q600 86 800 62 Q1000 38 1200 65 Q1350 85 1440 70 L1440 200 L0 200 Z" fill="url(#ocean3)" />
          {/* near foam */}
          <path d="M0 68 Q200 53 400 71 Q600 89 800 65 Q1000 41 1200 68 Q1350 88 1440 73" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {/* foam bubbles */}
          <circle cx="350" cy="76" r="2.5" fill="white" />
          <circle cx="380" cy="80" r="1.5" fill="white" />
          <circle cx="750" cy="70" r="2" fill="white" />
          <circle cx="1180" cy="75" r="2.5" fill="white" />
          {/* wet sand - overlaps ocean */}
          <path d="M0 95 Q360 85 720 97 Q1080 109 1440 92 L1440 200 L0 200 Z" fill="url(#wet-sand)" />
          {/* dry sand - overlaps wet sand */}
          <path d="M0 115 Q360 108 720 117 Q1080 126 1440 112 L1440 200 L0 200 Z" fill="url(#sand)" />

          {/* sand texture */}
          <g fill="#C4A038">
            <circle cx="200" cy="150" r="1.5" />
            <circle cx="450" cy="140" r="1" />
            <circle cx="700" cy="160" r="1.5" />
            <circle cx="950" cy="145" r="1" />
            <circle cx="1200" cy="155" r="1.5" />
            <circle cx="350" cy="165" r="1" />
            <circle cx="850" cy="170" r="1.5" />
            <circle cx="1100" cy="135" r="1" />
          </g>

          {/* starfish */}
          <g transform="translate(1050, 140) scale(0.8) rotate(-15)">
            <path d="M0 -12 L3 -3 L12 -3 L5 3 L7 12 L0 7 L-7 12 L-5 3 L-12 -3 L-3 -3 Z" fill="#E87461" />
            <path d="M0 -12 L3 -3 L12 -3 L5 3 L7 12 L0 7 L-7 12 L-5 3 L-12 -3 L-3 -3 Z" fill="#F28C7D" />
            <circle cx="0" cy="0" r="2" fill="#D4614F" />
          </g>

          {/* seashell */}
          <g transform="translate(400, 145) scale(0.7)">
            <ellipse cx="0" cy="0" rx="8" ry="6" fill="#F5E0C3" />
            <ellipse cx="0" cy="0" rx="8" ry="6" fill="#FAEBD7" />
            <path d="M-6 -2 Q-3 -5 0 -6 Q3 -5 6 -2" stroke="#D4B896" strokeWidth="1" fill="none" />
            <path d="M-5 0 Q-2 -3 0 -4 Q2 -3 5 0" stroke="#D4B896" strokeWidth="0.8" fill="none" />
          </g>
        </svg>
        <div className="bg-[#E8C96A] px-8 py-1.5">
          <span className="font-[family-name:var(--font-syne)] text-base lowercase tracking-[0.1em] text-[#8B7030]">
            simplesurf &copy; 2026
          </span>
        </div>
      </footer>
    </div>
  );
}

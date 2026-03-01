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
            {/* ocean gradients blend into each other */}
            <linearGradient id="ocean1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7ECCE5" />
              <stop offset="60%" stopColor="#29ABE2" />
              <stop offset="100%" stopColor="#0099DD" />
            </linearGradient>
            <linearGradient id="ocean2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#29ABE2" />
              <stop offset="50%" stopColor="#0099DD" />
              <stop offset="100%" stopColor="#0088CC" />
            </linearGradient>
            <linearGradient id="ocean3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0099DD" />
              <stop offset="40%" stopColor="#0088CC" />
              <stop offset="100%" stopColor="#005F8C" />
            </linearGradient>
            {/* ocean to sand transition */}
            <linearGradient id="wet-sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4B87A" />
              <stop offset="100%" stopColor="#D4B87A" />
            </linearGradient>
            <linearGradient id="sand" x1="0.15" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4B87A" />
              <stop offset="50%" stopColor="#F2D98B" />
              <stop offset="100%" stopColor="#E8C96A" />
            </linearGradient>
          </defs>

          {/* page bg fill behind everything */}
          <rect width="1440" height="200" fill="#F7F7F5" />
          {/* far ocean */}
          <path d="M0 18 C100 6, 220 40, 380 12 C480 -2, 620 36, 760 24 C860 16, 1020 44, 1160 10 C1300 -4, 1400 28, 1440 22 L1440 200 L0 200 Z" fill="url(#ocean1)" />
          {/* mid wave */}
          <path d="M0 46 C140 22, 260 54, 400 38 C500 28, 580 60, 700 32 C820 8, 940 52, 1060 42 C1140 36, 1300 58, 1440 28 L1440 200 L0 200 Z" fill="url(#ocean2)" />
          {/* foam highlight */}
          <path d="M0 48 C140 24, 260 56, 400 40 C500 30, 580 62, 700 34 C820 10, 940 54, 1060 44 C1140 38, 1300 60, 1440 30" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* near wave */}
          <path d="M0 68 C80 52, 200 86, 340 58 C440 40, 560 82, 680 72 C780 64, 880 90, 1020 54 C1120 30, 1280 78, 1440 66 L1440 200 L0 200 Z" fill="url(#ocean3)" />
          {/* near foam */}
          <path d="M0 70 C80 54, 200 88, 340 60 C440 42, 560 84, 680 74 C780 66, 880 92, 1020 56 C1120 32, 1280 80, 1440 68" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* foam bubbles */}
          <circle cx="310" cy="56" r="2" fill="white" />
          <circle cx="350" cy="50" r="1.5" fill="white" />
          <circle cx="650" cy="70" r="1.5" fill="white" />
          <circle cx="920" cy="58" r="2" fill="white" />
          <circle cx="1250" cy="74" r="1.5" fill="white" />
          {/* wet sand */}
          <path d="M0 94 C180 82, 350 102, 520 88 C680 76, 820 98, 1000 92 C1120 88, 1300 104, 1440 86 L1440 200 L0 200 Z" fill="url(#wet-sand)" />
          {/* dry sand */}
          <path d="M0 112 C200 102, 380 118, 560 108 C720 100, 900 116, 1080 112 C1200 108, 1360 120, 1440 106 L1440 200 L0 200 Z" fill="url(#sand)" />

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

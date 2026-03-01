"use client";

import { useEffect, useState } from "react";
import { SignInButton } from "~/app/_components/sign-in-button";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className={`landing-reveal fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-8 py-5 backdrop-blur-md bg-[#F7F7F5]/70 transition-[border-color] duration-300 border-b ${
        scrolled ? "border-[#141414]/[0.06]" : "border-transparent"
      }`}
    >
      <span className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight lowercase">
        simplesurf 🌊
      </span>
      <SignInButton className="cursor-pointer rounded-full bg-transparent px-6 py-3 text-base font-semibold text-[#141414] ring-1 ring-[#141414]/20 transition-all duration-300 hover:bg-[#141414] hover:text-[#F7F7F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077B6]">
        Sign in
      </SignInButton>
    </nav>
  );
}

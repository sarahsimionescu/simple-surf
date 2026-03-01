const steps = [
  {
    title: "Describe what you need",
    description:
      'Type a simple request like "Find me a recipe for banana bread." No special words needed, just say it like you would to a friend.',
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

export function LandingSteps() {
  return (
    <section
      aria-labelledby="steps-heading"
      className="px-6 py-32 md:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <h2
            id="steps-heading"
            className="font-[family-name:var(--font-syne)] text-base font-bold lowercase tracking-[0.15em] text-[#4A4A48] md:text-lg"
          >
            How it works
          </h2>
        </div>
        <div className="grid gap-16 md:grid-cols-3 md:gap-12">
          {steps.map((step, i) => (
            <div key={i} className="group">
              <span
                aria-hidden="true"
                className="font-[family-name:var(--font-syne)] text-base font-bold tracking-widest text-[#0077B6]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                aria-hidden="true"
                className="mt-4 mb-4 h-px w-8 bg-[#141414]/10 transition-all duration-500 group-hover:w-full group-hover:bg-[#0077B6]/40"
              />
              <h3 className="font-[family-name:var(--font-syne)] text-2xl font-bold lowercase leading-tight md:text-3xl">
                {step.title}
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-[#4A4A48]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

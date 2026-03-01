const rowOne = [
  "Find me a banana bread recipe",
  "What's the weather in Toronto?",
  "Book a flight to Vancouver",
  "Show me today's news",
  "Order flowers for my wife",
  "Find a plumber near me",
  "How do I renew my passport?",
  "Look up my prescription",
];

const rowTwo = [
  "Compare hotels in Banff",
  "What time does Costco close?",
  "Help me write an email",
  "Find a good lasagna recipe",
  "Show me my bank balance",
  "Track my Amazon package",
  "Find a doctor near me",
  "What movies are playing tonight?",
];

function MarqueeRow({
  items,
  reverse,
}: {
  items: string[];
  reverse?: boolean;
}) {
  // duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      {/* fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#F7F7F5] to-transparent md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#F7F7F5] to-transparent md:w-40" />

      <div
        className={`flex w-max gap-3 ${reverse ? "marquee-reverse" : "marquee"}`}
      >
        {doubled.map((text, i) => (
          <span
            key={i}
            className="shrink-0 select-none rounded-full border border-[#141414]/[0.06] bg-white px-5 py-2.5 text-base text-[#4A4A48] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-[#0077B6]/30 hover:shadow-md hover:text-[#141414]"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingMarquee() {
  return (
    <section aria-hidden="true" className="py-20 md:py-28">
      <div className="mb-10 text-center">
        <h2 className="font-[family-name:var(--font-syne)] text-base font-bold lowercase tracking-[0.15em] text-[#4A4A48] md:text-lg">
          just ask
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        <MarqueeRow items={rowOne} />
        <MarqueeRow items={rowTwo} reverse />
      </div>
    </section>
  );
}

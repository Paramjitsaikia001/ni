import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const logos = [
  { emoji: "🌊", name: "Stripe", bg: "#e8f4ff" },
  { emoji: "🔥", name: "Notion", bg: "#fff0e6" },
  { emoji: "🌿", name: "Linear", bg: "#e6ffe6" },
  { emoji: "⚡", name: "Vercel", bg: "#f0e6ff" },
  { emoji: "🎯", name: "Figma", bg: "#ffe6f0" },
  { emoji: "🔷", name: "Loom", bg: "#e6f0ff" },
  { emoji: "☀️", name: "Retool", bg: "#fff7e6" },
  { emoji: "🌐", name: "Webflow", bg: "#e6fff9" },
  { emoji: "🔮", name: "Anthropic", bg: "#f5e6ff" },
  { emoji: "❄️", name: "Intercom", bg: "#e6f4ff" },
];

const doubled = [...logos, ...logos];

const TrustedBy = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!trackRef.current) return;
    const totalW = trackRef.current.scrollWidth / 2;
    gsap.to(trackRef.current, {
      x: -totalW,
      duration: 28,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((v: string) => parseFloat(v) % totalW),
      },
    });
  }, { scope: sectionRef });

  return (
    <section id="trusted" ref={sectionRef} className="py-[60px] border-t border-b border-border overflow-hidden">
      <div className="text-center font-mono text-[.78rem] tracking-[.14em] uppercase text-muted-foreground mb-8">
        Trusted by world-class companies
      </div>
      <div className="relative overflow-hidden before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[120px] before:z-2 before:bg-linear-to-r before:from-background before:to-transparent after:absolute after:top-0 after:bottom-0 after:right-0 after:w-[120px] after:z-2 after:bg-linear-to-l after:from-background after:to-transparent">
        <div ref={trackRef} className="flex gap-16 items-center w-max will-change-transform">
          {doubled.map((logo, i) => (
            <div key={i} className="flex items-center gap-2.5 opacity-45 hover:opacity-90 transition-opacity cursor-default whitespace-nowrap shrink-0">
              <div className="w-8 h-8 rounded-md grid place-items-center text-base" style={{ background: logo.bg }}>{logo.emoji}</div>
              <span className="font-head text-[1.05rem] font-bold text-secondary-foreground tracking-tight">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;

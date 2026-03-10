import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const floatCards = [
  { emoji: "🏦", title: "Senior UX Designer", sub: "Stripe · San Francisco", badge: "New", isNew: true, bg: "#1a1f35" },
  { emoji: "🚀", title: "Product Manager", sub: "Vercel · Remote", badge: "$180k", isNew: false, bg: "#101820" },
  { emoji: "🤖", title: "ML Engineer", sub: "Mistral AI · Paris", badge: "Hot", isNew: true, bg: "#1a0e2e" },
];

const stats = [
  { num: "48", suffix: "k+", label: "Active Jobs" },
  { num: "12", suffix: "k+", label: "Companies" },
  { num: "96", suffix: "%", label: "Placement" },
];

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.2 });

    tl.from(".hero-tag", { opacity: 0, y: 20, duration: 0.6, ease: "power3.out" })
      .from(".hero-headline-line", { opacity: 0, y: 60, duration: 1, ease: "power3.out", stagger: 0.12 }, "-=.3")
      .from(".hero-sub", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=.5")
      .from(".hero-actions", { opacity: 0, y: 20, duration: 0.7, ease: "power3.out" }, "-=.4")
      .from(".hero-stats > *", { opacity: 0, y: 20, duration: 0.6, ease: "power3.out", stagger: 0.08 }, "-=.3")
      .fromTo(".float-card", { opacity: 0, x: 80, rotation: 3, duration: 0.8, ease: "back.out(1.2)", stagger: 0.12 }, {opacity: 1, x: 0, rotation: 0}, "-=.6");

    // Parallax
    gsap.to(".shape-1", { yPercent: -25, ease: "none", scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: 1.5 } });
    gsap.to(".shape-2", { yPercent: 20, ease: "none", scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: 2 } });
  }, { scope: sectionRef });

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-16">
      {/* BG */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(24_100%_62%/0.06),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_50%,hsl(160_84%_44%/0.04),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-size-[80px_80px] mask-[radial-gradient(ellipse_60%_60%_at_50%_0%,black_20%,transparent_100%)]" />
      <div className="shape-1 absolute w-125 h-125 rounded-full blur-[100px] bg-primary/8 -top-50 left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="shape-2 absolute w-87.5 h-87.5 rounded-full blur-[100px] bg-teal/6 bottom-0 -left-25 pointer-events-none" />

      <div className="apex-container w-full relative z-2">
        <div className="grid lg:grid-cols-[1fr_380px] gap-16 items-center">
          <div>
            <div className="hero-tag inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full py-1.5 px-4 pl-2.5 mb-10">
              <div className="w-5 h-5 bg-primary rounded-full grid place-items-center text-[9px] text-primary-foreground font-bold animate-pulse">✦</div>
              <span className="text-[.78rem] font-mono text-gold-light tracking-wide">2,400+ roles added this week</span>
            </div>

            <h1 className="font-head text-[clamp(3.5rem,8vw,6.5rem)] font-normal leading-[0.95] text-secondary-foreground mb-8 tracking-[-0.03em]">
              <span className="hero-headline-line block">Find your</span>
              <span className="hero-headline-line block italic text-primary">next chapter</span>
              <span className="hero-headline-line block">in one place.</span>
            </h1>

            <p className="hero-sub text-[1.05rem] text-muted-foreground max-w-115 leading-[1.8] mb-10">
              HireGenie connects exceptional talent with forward-thinking companies. Search curated roles, apply in minutes, land the position you deserve.
            </p>

            <div className="hero-actions flex items-center gap-4 flex-wrap mb-16">
              <a href="#jobs" className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-primary text-primary-foreground text-[.88rem] font-semibold shadow-[0_4px_24px_hsl(var(--gold)/0.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_hsl(var(--gold)/0.5)] transition-all duration-300">
                <svg className="transition-transform group-hover:scale-110" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" /></svg>
                Explore Jobs
              </a>
              <a href="#" className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-transparent text-secondary-foreground border border-secondary-foreground/15 text-[.88rem] font-semibold hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all duration-300">
                For Employers
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 1l6 6-6 6" /></svg>
              </a>
            </div>

            <div className="hero-stats flex gap-10 pt-8 border-t border-border">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-head text-[2.2rem] text-secondary-foreground leading-none tracking-tight">
                    {s.num}<span className="text-primary">{s.suffix}</span>
                  </div>
                  <div className="text-[.72rem] text-muted-foreground font-mono tracking-[.08em] uppercase mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Float cards - desktop */}
          <div className="hidden lg:flex flex-col gap-4">
            {floatCards.map((card, i) => (
              <div key={i} className="float-card group bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-5 flex items-center gap-4 shadow-[0_16px_48px_rgba(0,0,0,.5)] hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="w-12 h-12 rounded-xl grid place-items-center text-xl shrink-0 transition-transform group-hover:scale-110" style={{ background: card.bg }}>{card.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[.88rem] font-semibold text-secondary-foreground mb-0.5 truncate">{card.title}</h4>
                  <p className="text-[.75rem] text-muted-foreground truncate">{card.sub}</p>
                </div>
                <div className={`font-mono text-[.68rem] tracking-wide rounded-lg px-2.5 py-1 whitespace-nowrap ${
                  card.isNew ? "text-primary bg-primary/10" : "text-teal bg-teal/10"
                }`}>
                  {card.badge}
                </div>
              </div>
            ))}
            {/* Decorative gradient card */}
            <div className="relative overflow-hidden rounded-2xl p-5 border border-primary/10 bg-linear-to-br from-primary/8 to-transparent">
              <div className="text-[.8rem] text-primary font-medium mb-1">+ 2,397 more roles</div>
              <div className="text-[.72rem] text-muted-foreground">Updated every hour</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

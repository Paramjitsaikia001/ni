import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const steps = [
  { icon: "🔍", num: "01", title: "Build Your Profile", desc: "Create a rich, verified profile in under 10 minutes. Showcase skills, past work, and salary expectations." },
  { icon: "✦", num: "02", title: "Get Matched", desc: "Our matching engine surfaces roles aligned to your experience, location, and salary band — in real time." },
  { icon: "🚀", num: "03", title: "Apply & Succeed", desc: "One-click apply. Track applications, schedule interviews, and negotiate offers from one dashboard." },
];

const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".step-item", {
      opacity: 0, y: 60, duration: 0.9, stagger: 0.15, ease: "power3.out",
      scrollTrigger: { trigger: ".steps-grid", start: "top 80%", once: true },
    });
  }, { scope: sectionRef });

  return (
    <section id="how" ref={sectionRef} className="relative py-28 lg:py-36 bg-deep border-t border-b border-border overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_100%,hsl(160_84%_44%/0.03),transparent)]" />
      <div className="apex-container relative z-1">
        <div className="text-center mb-20">
          <div className="apex-tag">Simple Process</div>
          <h2 className="apex-section-title">Three steps to your<br /><span className="italic text-primary">next role</span></h2>
          <p className="apex-section-sub mx-auto">From profile to placement — we've stripped out all the friction.</p>
        </div>

        <div className="steps-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="step-item group relative bg-surface/50 border border-border rounded-2xl p-8 text-center hover:border-primary/20 transition-all duration-400">
              <div className="absolute top-6 right-6 font-mono text-[.65rem] tracking-widest text-muted-foreground/50">{step.num}</div>
              <div className="relative inline-block mb-7">
                <div className="w-20 h-20 rounded-2xl bg-panel border border-border grid place-items-center text-[28px] mx-auto transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                  {step.icon}
                </div>
              </div>
              <h3 className="font-head text-[1.3rem] text-secondary-foreground mb-3 italic">{step.title}</h3>
              <p className="text-[.88rem] text-muted-foreground leading-[1.75]">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-primary/20 text-lg z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

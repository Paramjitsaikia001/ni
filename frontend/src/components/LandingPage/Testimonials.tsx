import { useRef, useState, useCallback, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  { quote: "Landed my dream role at a Series B startup in 3 weeks. The quality of listings here is miles ahead of any other job board — no noise, just great opportunities.", avatar: "👩‍💻", avatarBg: "#1e293b", name: "Priya Mehta", role: "Senior Engineer · Hired at Loom" },
  { quote: "I'd been stuck at the same company for 5 years. Apex helped me make a lateral move into product with a 40% salary bump. The smart matching is genuinely impressive.", avatar: "🧑‍🎨", avatarBg: "#0f2027", name: "Marcus Johansson", role: "Product Manager · Hired at Linear" },
  { quote: "As a hiring manager, Apex cuts our time-to-hire in half. The talent pool is extraordinary — every candidate we interview has been thoroughly vetted and genuinely excited.", avatar: "👩‍💼", avatarBg: "#1a0d2e", name: "Sarah Chen", role: "VP Engineering · Retool" },
  { quote: "Relocated from Toronto to London with two remote offers in hand before I even landed. The international listings and relocation tools are a game changer.", avatar: "🧑‍🚀", avatarBg: "#0d1b2a", name: "Ayaan Raza", role: "Design Lead · Hired at Figma" },
];

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  useGSAP(() => {
    gsap.from(".testi-card", {
      opacity: 0, y: 40, duration: 0.7, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: "#testimonials", start: "top 80%", once: true },
    });
  }, { scope: sectionRef });

  const goTo = useCallback((idx: number) => {
    const i = ((idx % testimonials.length) + testimonials.length) % testimonials.length;
    setCurrent(i);
    if (!trackRef.current) return;
    const card = trackRef.current.querySelector(".testi-card") as HTMLElement;
    if (!card) return;
    const cardW = card.offsetWidth + 28;
    gsap.to(trackRef.current, { x: -i * cardW, duration: 0.55, ease: "power3.inOut" });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => goTo(current + 1), 5000);
    return () => clearInterval(interval);
  }, [current, goTo]);

  return (
    <section id="testimonials" ref={sectionRef} className="py-[120px] overflow-hidden">
      <div className="apex-container">
        <div className="text-center mb-16">
          <div className="apex-tag">Success Stories</div>
          <h2 className="apex-section-title">Words from people<br />who've been here</h2>
        </div>
      </div>
      <div className="px-8 max-w-[1300px] mx-auto overflow-hidden">
        <div className="relative overflow-hidden">
          <div ref={trackRef} className="flex gap-7 will-change-transform">
            {testimonials.map((t, i) => (
              <div key={i} className="testi-card bg-surface border border-border rounded-lg p-9 min-w-[400px] max-[480px]:min-w-[90vw] shrink-0 opacity-0">
                <div className="text-[2.5rem] text-primary leading-none mb-4 font-head">"</div>
                <p className="text-[.95rem] text-foreground leading-[1.75] mb-7">{t.quote}</p>
                <div className="flex items-center gap-3.5 pt-[22px] border-t border-border">
                  <div className="w-11 h-11 rounded-full grid place-items-center text-lg shrink-0" style={{ background: t.avatarBg }}>{t.avatar}</div>
                  <div>
                    <div className="text-primary text-[.8rem] mb-0.5">★★★★★</div>
                    <div className="font-semibold text-[.9rem] text-secondary-foreground">{t.name}</div>
                    <div className="text-[.78rem] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-3 mt-10">
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`h-2 rounded-full border transition-all cursor-pointer ${
              i === current ? "w-6 bg-primary border-primary" : "w-2 bg-panel border-border"
            }`} />
          ))}
        </div>
        <div className="flex justify-center gap-3 mt-5">
          <button onClick={() => goTo(current - 1)} className="w-[42px] h-[42px] rounded-full border border-border bg-transparent text-foreground cursor-pointer text-sm grid place-items-center transition-all hover:bg-primary hover:border-primary hover:text-primary-foreground">←</button>
          <button onClick={() => goTo(current + 1)} className="w-[42px] h-[42px] rounded-full border border-border bg-transparent text-foreground cursor-pointer text-sm grid place-items-center transition-all hover:bg-primary hover:border-primary hover:text-primary-foreground">→</button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const columns = [
  { title: "For Job Seekers", links: ["Browse Jobs", "Companies", "Salary Explorer", "Career Advice", "Resume Builder"] },
  { title: "For Employers", links: ["Post a Job", "Talent Search", "Pricing", "ATS Integration", "Employer Brand"] },
  { title: "Company", links: ["About Us", "Blog", "Press", "Careers", "Contact"] },
];

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".footer-col-anim", {
      opacity: 0, y: 30, duration: 0.7, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: footerRef.current, start: "top 85%", once: true },
    });
  }, { scope: footerRef });

  return (
    <footer id="footer" ref={footerRef} className="bg-deep border-t border-border pt-20 pb-10">
      <div className="apex-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-16 mb-16">
          <div className="footer-col-anim sm:col-span-2 lg:col-span-1">
            <a href="/" className="inline-flex items-center gap-3 group mb-5">
              <div className="w-9 h-9 bg-primary rounded-xl grid place-items-center transition-transform group-hover:rotate-12">
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="hsl(var(--ink))" /></svg>
              </div>
              <span className="font-head text-[1.5rem] text-secondary-foreground tracking-tight italic">HireGenie</span>
            </a>
            <p className="text-[.85rem] text-muted-foreground leading-[1.75] max-w-65">The premium job board connecting exceptional talent with forward-thinking companies.</p>
            <div className="flex gap-2.5 mt-6">
              {["𝕏", "in", "▶", "⧖"].map((icon) => (
                <button key={icon} className="w-9 h-9 rounded-xl border border-border bg-transparent text-muted-foreground cursor-pointer text-sm grid place-items-center transition-all duration-300 hover:bg-primary hover:border-primary hover:text-primary-foreground">{icon}</button>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title} className="footer-col-anim">
              <h4 className="text-[.72rem] font-mono tracking-[.14em] uppercase text-secondary-foreground mb-5">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-[.85rem] text-muted-foreground hover:text-primary transition-colors duration-300">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-8 border-t border-border text-[.75rem] text-muted-foreground flex-wrap gap-3">
          <span>© 2025 HireGenie. All rights reserved.</span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Cookies"].map((l) => (
              <a key={l} href="#" className="text-muted-foreground hover:text-secondary-foreground transition-colors duration-300">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

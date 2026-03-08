import { useEffect, useRef, useState } from "react";

const Navbar = () => {
  const [solid, setSolid] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-1000 transition-all duration-400 ${
        solid
          ? "bg-ink/[.92] backdrop-blur-md py-3.5 shadow-[0_1px_0_hsl(var(--border))]"
          : "py-5"
      }`}
    >
      <div className="apex-container">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 font-head text-[1.4rem] font-bold text-secondary-foreground tracking-tight">
            <div className="w-[34px] h-[34px] bg-primary rounded-lg grid place-items-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="hsl(var(--ink))" />
              </svg>
            </div>
            Apex Careers
          </a>
          <div className="hidden md:flex items-center gap-9">
            <a href="#jobs" className="text-[.88rem] font-medium text-muted-foreground hover:text-secondary-foreground transition-colors">Jobs</a>
            <a href="#how" className="text-[.88rem] font-medium text-muted-foreground hover:text-secondary-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-[.88rem] font-medium text-muted-foreground hover:text-secondary-foreground transition-colors">Stories</a>
          </div>
          <div className="flex items-center gap-3.5">
            <a href="#" className="text-[.88rem] font-medium text-foreground hover:text-primary transition-colors hidden sm:block">Login</a>
            <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[.82rem] font-semibold shadow-[0_4px_20px_hsl(var(--gold)/0.35)] hover:-translate-y-0.5 transition-transform">
              Post a Job
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

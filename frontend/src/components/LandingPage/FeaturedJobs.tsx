import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

type PillType = "remote" | "full" | "hybrid" | "part";

const pillStyles: Record<PillType, string> = {
  remote: "bg-primary/10 text-primary",
  full: "bg-teal/10 text-teal",
  hybrid: "bg-lavender/10 text-lavender",
  part: "bg-destructive/10 text-destructive",
};

const jobs = [
  {
    logo: "🏦",
    logoBg: "#141a2e",
    title: "Senior Product Designer",
    company: "Stripe",
    location: "San Francisco",
    type: "Full-time",
    pill: "remote" as PillType,
    pillLabel: "Remote",
    salary: "$140k – $175k",
  },
  {
    logo: "⚡",
    logoBg: "#101010",
    title: "Staff Frontend Engineer",
    company: "Vercel",
    location: "Remote, USA",
    type: "Full-time",
    pill: "full" as PillType,
    pillLabel: "Full-time",
    salary: "$180k – $220k",
  },
  {
    logo: "🤖",
    logoBg: "#1a0e2e",
    title: "ML Research Engineer",
    company: "Anthropic",
    location: "London, UK",
    type: "Full-time",
    pill: "hybrid" as PillType,
    pillLabel: "Hybrid",
    salary: "£120k – £160k",
  },
  {
    logo: "🌿",
    logoBg: "#0c1828",
    title: "Head of Product",
    company: "Linear",
    location: "Worldwide",
    type: "Full-time",
    pill: "remote" as PillType,
    pillLabel: "Remote",
    salary: "$160k – $200k",
  },
  {
    logo: "🎯",
    logoBg: "#14082e",
    title: "Design Systems Lead",
    company: "Figma",
    location: "New York",
    type: "Full-time",
    pill: "full" as PillType,
    pillLabel: "Full-time",
    salary: "$145k – $185k",
  },
  {
    logo: "🔮",
    logoBg: "#0e1f14",
    title: "Growth Marketing Manager",
    company: "Notion",
    location: "Remote, EU",
    type: "Part-time",
    pill: "part" as PillType,
    pillLabel: "Part-time",
    salary: "$80k – $100k",
  },
];

const FeaturedJobs = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.to(".job-card", {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none reverse"
        }
      })
    },
    { scope: sectionRef, dependencies: jobs },
  );

  return (
    <section id="jobs" ref={sectionRef} className="py-28 lg:py-36">
      <div className="apex-container">
        <div className="flex items-end justify-between flex-wrap gap-8 mb-16">
          <div>
            <div className="apex-tag">Featured Roles</div>
            <h2 className="apex-section-title">
              Opportunities worth
              <br />
              <span className="italic text-primary">pursuing</span>
            </h2>
          </div>
          <p className="apex-section-sub pb-2">
            Handpicked roles from companies building what's next. Updated daily.
          </p>
        </div>

        <div className="jobs-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-14">
          {jobs.map((job, i) => (
            <div
              key={i}
              className="job-card group relative bg-surface border border-border rounded-2xl p-7 cursor-pointer transition-all duration-400 hover:border-primary/25 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(0,0,0,.4)] overflow-hidden"
              style={{opacity: 0, y: 50}}
            >
              <div className="absolute inset-0 bg-linear-to-br from-primary/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-1">
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl grid place-items-center text-2xl ring-1 ring-border"
                    style={{ background: job.logoBg }}
                  >
                    {job.logo}
                  </div>
                  <span
                    className={`font-mono text-[.68rem] tracking-[.06em] px-2.5 py-1 rounded-lg font-medium ${pillStyles[job.pill]}`}
                  >
                    {job.pillLabel}
                  </span>
                </div>
                <h3 className="font-head text-[1.25rem] text-secondary-foreground mb-1 leading-tight italic">
                  {job.title}
                </h3>
                <div className="text-[.82rem] text-primary font-medium mb-5">
                  {job.company}
                </div>
                <div className="flex gap-4 flex-wrap mb-6">
                  <span className="flex items-center gap-1.5 text-[.76rem] text-muted-foreground">
                    📍 {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-[.76rem] text-muted-foreground">
                    🕒 {job.type}
                  </span>
                </div>
                <div className="font-mono text-[.82rem] text-secondary-foreground font-medium pt-5 border-t border-border flex items-center justify-between">
                  <span className="text-teal">{job.salary}</span>
                  <div className="w-8 h-8 border border-border rounded-full grid place-items-center text-xs transition-all duration-300 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground group-hover:-rotate-45">
                    →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#"
            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-transparent text-secondary-foreground border border-secondary-foreground/15 text-[.88rem] font-semibold hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all duration-300"
          >
            View All 48,000+ Jobs
            <svg
              className="transition-transform group-hover:translate-x-1"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M1 7h12M7 1l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedJobs;

import { useQuery } from "@tanstack/react-query";
import { fetchJobs, type Job } from "../lib/api";
import { Link, Outlet, useParams } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Briefcase, Clock, Plus } from "lucide-react";
import Navbar from "../components/LandingPage/Navbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { fetchJob } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";
import type { ReactNode } from "react";
const experienceColors: Record<string, string> = {
  junior: "bg-accent/20 text-accent border-accent/30",
  mid: "bg-lavender/20 text-lavender border-lavender/30",
  senior: "bg-gold/20 text-gold border-gold/30",
  lead: "bg-primary/20 text-primary border-primary/30",
};
function getExpClass(level: string) {
  return (
    experienceColors[level.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}
function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function isExpired(dateStr: string) {
  return new Date(dateStr).getTime() < Date.now();
}
/* ─── Job Card ─── */
function JobCard({ job }: { job: Job }) {
  return (
    <Link
      to={`/jobs/${job._id}`}
      className="group block rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_-12px_hsl(var(--gold)/0.15)]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-body text-[1.05rem] font-semibold text-secondary-foreground truncate group-hover:text-primary transition-colors">
            {job.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {job.companyDetails}
          </p>
        </div>
        {isExpired(job.expiresAt) && (
          <Badge variant="destructive" className="shrink-0 text-[10px]">
            Expired
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
        {job.description}
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {job.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-border bg-secondary text-muted-foreground"
          >
            {s}
          </span>
        ))}
        {job.skills.length > 4 && (
          <span className="text-[10px] text-muted-foreground">
            +{job.skills.length - 4}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" />
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${getExpClass(job.experienceLevel)}`}
          >
            {job.experienceLevel}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {timeAgo(job.createdAt)}
        </span>
      </div>
    </Link>
  );
}
/* ─── Job Detail Panel ─── */
export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  let {
    data: job,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
  });

  // @ts-ignore
  job = job?.data;

  return (
    <Sheet open onOpenChange={() => navigate("/jobs")}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-130 bg-card border-border overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-secondary-foreground font-body">
            {isLoading ? <Skeleton className="h-7 w-48" /> : job?.title}
          </SheetTitle>
          <SheetDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              job?.companyDetails
            )}
          </SheetDescription>
        </SheetHeader>
        {error && (
          <p className="text-destructive text-sm">
            Failed to load job details.
          </p>
        )}
        {job && (
          <div className="space-y-6">
            {/* Experience & Expiry */}
            <div className="flex flex-wrap gap-3">
              <span
                className={`px-3 py-1 rounded-full border text-xs font-medium ${getExpClass(job.experienceLevel)}`}
              >
                {job.experienceLevel}
              </span>
              <span
                className={`px-3 py-1 rounded-full border text-xs font-medium ${isExpired(job.expiresAt) ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-accent/20 text-accent border-accent/30"}`}
              >
                {isExpired(job.expiresAt)
                  ? "Expired"
                  : `Expires ${new Date(job.expiresAt).toLocaleDateString()}`}
              </span>
            </div>
            {/* Description */}
            <div>
              <h4 className="font-mono text-[10px] tracking-widest uppercase text-primary mb-2">
                Description
              </h4>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
            {/* Skills */}
            <div>
              <h4 className="font-mono text-[10px] tracking-widest uppercase text-primary mb-2">
                Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {/* Posted */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Posted {timeAgo(job.createdAt)}
              </p>
            </div>

            <div>
              <a href={`/apply/${job._id}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[.82rem] font-semibold shadow-[0_4px_20px_hsl(var(--gold)/0.35)] hover:-translate-y-0.5 transition-transform">
                  Apply Now
              </a>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
/* ─── Main Jobs Page ─── */
export default function Jobs() {
  let {
    data: jobs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  // @ts-ignore
  jobs = jobs?.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="apex-container">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="apex-tag">Open Positions</div>
              <h1 className="apex-section-title">Find Your Next Role</h1>
              <p className="apex-section-sub">
                Browse opportunities from top companies.
              </p>
            </div>
            <Link to="/jobs/create">
              <Button className="gap-2 shadow-[0_4px_24px_hsl(var(--gold)/0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_hsl(var(--gold)/0.5)] transition-all duration-300">
                <Plus className="w-4 h-4" />
                Post a Job
              </Button>
            </Link>
          </div>

          {isLoading &&
            ((
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-5 space-y-3"
                  >
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) as ReactNode)}

          {error && (
            <div className="text-center py-20">
              <p className="text-destructive mb-2">Failed to load jobs</p>
              <p className="text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
            </div>
          )}

          {jobs && jobs.length === 0 && (
            <div className="text-center py-20">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-secondary-foreground mb-2">
                No jobs posted yet
              </p>
              <p className="text-sm text-muted-foreground">
                Be the first to post a job.
              </p>
            </div>
          )}
          {/* Grid */}
          {jobs && jobs.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </div>
      </main>
      {/* Nested route for side panel */}
      <Outlet />
    </div>
  );
}

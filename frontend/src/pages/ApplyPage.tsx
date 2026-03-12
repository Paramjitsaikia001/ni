import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJob, applyToJob } from "../lib/api";
import Navbar from "../components/LandingPage/Navbar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Briefcase,
  User,
  Mail,
  BarChart2,
  Sparkles,
} from "lucide-react";

/* ─── Types ─── */
interface FormState {
  candidateName: string;
  candidateEmail: string;
  yearsOfExperience: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

/* ─── Field wrapper ─── */
function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-primary">
        <span className="text-primary/60">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Input ─── */
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  hasError?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200
        focus:bg-secondary/60 focus:ring-1
        ${
          hasError
            ? "border-destructive/50 focus:border-destructive focus:ring-destructive/20"
            : "border-border focus:border-primary/50 focus:ring-primary/10"
        }`}
    />
  );
}

/* ─── Resume Drop Zone ─── */
function ResumeDropzone({
  file,
  onFile,
  onClear,
  hasError,
}: {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  hasError?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") onFile(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onFile(picked);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-secondary-foreground truncate">
            {file.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
          </p>
        </div>
        <button
          onClick={onClear}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 px-6 py-8 flex flex-col items-center gap-3 group
        ${
          dragging
            ? "border-primary/60 bg-primary/8 scale-[1.01]"
            : hasError
              ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
              : "border-border bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40"
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          dragging ? "bg-primary/20 scale-110" : "bg-secondary group-hover:bg-primary/10"
        }`}
      >
        <Upload
          className={`w-5 h-5 transition-colors ${dragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}
        />
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium transition-colors ${dragging ? "text-primary" : "text-secondary-foreground"}`}>
          {dragging ? "Drop your PDF here" : "Drop resume or click to browse"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">PDF only · Max 10 MB</p>
      </div>
    </div>
  );
}

/* ─── Success screen with Interview Button ─── */
function SuccessScreen({
  jobTitle,
  onBack,
  applicationId,
}: {
  jobTitle: string;
  onBack: () => void;
  applicationId: string | null;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      style={{ animation: "fadeSlideUp 0.4s ease both" }}
    >
      <div className="relative w-20 h-20 mb-6">
        <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[ping_1.6s_ease-out_infinite]" />
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(135deg, hsl(var(--gold)/0.3) 0%, hsl(var(--primary)/0.15) 100%)",
            border: "1px solid hsl(var(--gold)/0.4)",
            boxShadow: "0 0 40px hsl(var(--gold)/0.2)",
          }}
        >
          <CheckCircle2 className="w-9 h-9 text-gold" />
        </div>
      </div>

      <div className="apex-tag mx-auto mb-3">Application Submitted</div>
      <h2 className="font-body text-2xl font-semibold text-secondary-foreground mb-2">
        You're in the running!
      </h2>
      <div className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
        Your application for <span className="text-secondary-foreground font-medium">{jobTitle}</span> has been received.
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {applicationId && (
          <Link to={`/interview/${applicationId}`} className="w-full">
            <Button className="w-full gap-2 bg-primary shadow-[0_4px_20px_hsl(var(--gold)/0.3)] hover:scale-[1.02] transition-transform">
              <Sparkles className="w-4 h-4" />
              Start AI Interview
            </Button>
          </Link>
        )}
        <Button variant="outline" onClick={onBack} className="w-full gap-2">
          <ArrowLeft className="w-4 h-4" />
          Browse More Jobs
        </Button>
      </div>
    </div>
  );
}

/* ─── Main Apply Page ─── */
export default function Apply() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
  });

  const jobData = (job as any)?.data || job;

  const [form, setForm] = useState<FormState>({
    candidateName: "",
    candidateEmail: "",
    yearsOfExperience: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<FormState & { resume: string }>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.candidateName.trim()) next.candidateName = "Full name is required.";
    if (!form.candidateEmail.trim()) next.candidateEmail = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.candidateEmail))
      next.candidateEmail = "Enter a valid email address.";
    if (!form.yearsOfExperience) next.yearsOfExperience = "Years of experience is required.";
    if (!resume) next.resume = "Please attach your resume (PDF).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !id) return;
    setStatus("loading");
    setServerError(null);

    try {
      const body = new FormData();
      body.append("candidateName", form.candidateName.trim());
      body.append("candidateEmail", form.candidateEmail.trim());
      body.append("yearsOfExperience", form.yearsOfExperience);
      body.append("resume", resume!);

      const response = await applyToJob(id, body);
      
      // Capture the ID from your controller's response
      setAppId(response.applicationId || response.data?._id);
      setStatus("success");
    } catch (err: any) {
      setServerError(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-28 pb-20">
          <div className="apex-container max-w-lg">
            <SuccessScreen
              jobTitle={jobData?.title ?? "this position"}
              onBack={() => navigate("/jobs")}
              applicationId={appId}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="apex-container max-w-2xl">
          <Link
            to={`/jobs/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to job
          </Link>

          <div className="mb-10">
            <div className="apex-tag mb-3">Application</div>
            <h1 className="apex-section-title">
              {jobLoading ? <Skeleton className="h-9 w-64" /> : `Apply for ${jobData?.title}`}
            </h1>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-gold to-lavender" />
            <div className="p-8 space-y-7">
              <Field label="Full Name" icon={<User className="w-3 h-3" />} error={errors.candidateName}>
                <Input value={form.candidateName} onChange={(v) => set("candidateName", v)} placeholder="Jane Smith" hasError={!!errors.candidateName} />
              </Field>

              <Field label="Email Address" icon={<Mail className="w-3 h-3" />} error={errors.candidateEmail}>
                <Input value={form.candidateEmail} onChange={(v) => set("candidateEmail", v)} placeholder="jane@example.com" type="email" hasError={!!errors.candidateEmail} />
              </Field>

              <Field label="Years of Experience" icon={<BarChart2 className="w-3 h-3" />} error={errors.yearsOfExperience}>
                <div className="relative">
                  <Input value={form.yearsOfExperience} onChange={(v) => set("yearsOfExperience", v)} placeholder="4" type="number" hasError={!!errors.yearsOfExperience} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">years</span>
                </div>
              </Field>

              <Field label="Resume" icon={<FileText className="w-3 h-3" />} error={errors.resume}>
                <ResumeDropzone file={resume} onFile={setResume} onClear={() => setResume(null)} hasError={!!errors.resume} />
              </Field>

              {serverError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="text-[11px] text-muted-foreground max-w-[200px]">
                  By applying you agree to our <span className="text-primary underline cursor-pointer">terms of service</span>.
                </div>
                <Button onClick={handleSubmit} disabled={status === "loading"} size="lg" className="gap-2 shadow-lg hover:-translate-y-0.5 transition-all">
                  {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Application"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
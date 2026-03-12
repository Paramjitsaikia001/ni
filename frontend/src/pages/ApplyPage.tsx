import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchJob } from "../lib/api";
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
  BarChart2,
} from "lucide-react";

const BACKEND = import.meta.env.VITE_BACKEND_ENDPOINT ?? "";

/* ─── Types ─── */
interface FormState {
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
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
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

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          dragging
            ? "bg-primary/20 scale-110"
            : "bg-secondary group-hover:bg-primary/10"
        }`}
      >
        <Upload
          className={`w-5 h-5 transition-colors ${dragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}
        />
      </div>

      <div className="text-center">
        <p
          className={`text-sm font-medium transition-colors ${dragging ? "text-primary" : "text-secondary-foreground"}`}
        >
          {dragging ? "Drop your PDF here" : "Drop resume or click to browse"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          PDF only · Max 10 MB
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Main Apply Page
════════════════════════════════════════ */
export default function Apply() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob(id!),
    enabled: !!id,
  });


  const [form, setForm] = useState<FormState>({
    yearsOfExperience: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<FormState & { resume: string }>>(
    {},
  );
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    // candidate information comes from authenticated user
    if (!form.yearsOfExperience)
      next.yearsOfExperience = "Years of experience is required.";
    else if (
      isNaN(Number(form.yearsOfExperience)) ||
      Number(form.yearsOfExperience) < 0
    )
      next.yearsOfExperience = "Enter a valid number.";
    if (!resume) next.resume = "Please attach your resume (PDF).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setStatus("loading");
    setServerError(null);

    try {
      const body = new FormData();
      body.append("jobId", id!);
      // include user id from local storage as candidateID
      const stored = localStorage.getItem("user");
      const candidateID = stored ? JSON.parse(stored).id : null;
      if (!candidateID) {
        throw new Error("User not logged in");
      }
      body.append("candidateID", candidateID);
      body.append("yearsOfExperience", form.yearsOfExperience);
      body.append("resume", resume!, "resume.pdf");

      const res = await fetch(`${BACKEND}/applications/apply`, {
        method: "POST",
        body,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const result = await res.json();
      // navigate straight to interview using returned applicationId
      if (result.applicationId) {
        navigate(`/interview/${result.applicationId}`);
        return;
      }
      setStatus("success"); // fallback
    } catch {
      setServerError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .field-reveal { animation: fadeSlideUp 0.4s ease both; }
      `}</style>

      <div className="min-h-screen bg-background">
        <Navbar isLoggedIn={true}/>

        <main className="pt-28 pb-20">
          <div className="apex-container max-w-2xl">
            {/* Back */}
            <Link
              to={`/jobs/${id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to job
            </Link>

            {/* Header */}
            <div className="mb-10 field-reveal">
              <div className="apex-tag mb-3">Application</div>
              <h1 className="apex-section-title">
                {jobLoading ? (
                  <Skeleton className="h-9 w-64 inline-block" />
                ) : (
                  `Apply for ${job?.title}`
                )}
              </h1>
              {job && (
                <>
                  <div className="flex items-center gap-2 mt-3">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {job.companyDetails}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please enter your years of experience and upload a PDF
                    resume.
                  </p>
                </>
              )}
            </div>

            {/* Card */}
            <div
              className="rounded-2xl border border-border bg-card overflow-hidden"
              style={{ animation: "fadeSlideUp 0.5s ease 0.1s both" }}
            >
              {/* Card header stripe */}
              <div
                className="h-1 w-full"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--gold)) 50%, hsl(var(--lavender)) 100%)",
                }}
              />

              <div className="p-8 space-y-7">
                {/* Years of experience */}
                <div
                  className="field-reveal"
                  style={{ animationDelay: "0.25s" }}
                >
                  <Field
                    label="Years of Experience"
                    icon={<BarChart2 className="w-3 h-3" />}
                    error={errors.yearsOfExperience}
                  >
                    <div className="relative">
                      <Input
                        value={form.yearsOfExperience}
                        onChange={(v) => set("yearsOfExperience", v)}
                        placeholder="4"
                        type="number"
                        hasError={!!errors.yearsOfExperience}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        years
                      </span>
                    </div>

                    {/* Visual scale */}
                    {form.yearsOfExperience &&
                      !isNaN(Number(form.yearsOfExperience)) && (
                        <div className="flex items-center gap-2 mt-2">
                          {(["junior", "mid", "senior", "lead"] as const).map(
                            (lvl, i) => {
                              const yoe = Number(form.yearsOfExperience);
                              const active =
                                (lvl === "junior" && yoe < 2) ||
                                (lvl === "mid" && yoe >= 2 && yoe < 5) ||
                                (lvl === "senior" && yoe >= 5 && yoe < 10) ||
                                (lvl === "lead" && yoe >= 10);
                              return (
                                <span
                                  key={lvl}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all duration-300 ${
                                    active
                                      ? [
                                          "bg-accent/20 text-accent border-accent/30",
                                          "bg-lavender/20 text-lavender border-lavender/30",
                                          "bg-gold/20 text-gold border-gold/30",
                                          "bg-primary/20 text-primary border-primary/30",
                                        ][i]
                                      : "bg-transparent text-muted-foreground/40 border-border/40"
                                  }`}
                                >
                                  {lvl}
                                </span>
                              );
                            },
                          )}
                        </div>
                      )}
                  </Field>
                </div>

                {/* Resume upload */}
                <div
                  className="field-reveal"
                  style={{ animationDelay: "0.3s" }}
                >
                  <Field
                    label="Resume"
                    icon={<FileText className="w-3 h-3" />}
                    error={errors.resume}
                  >
                    <ResumeDropzone
                      file={resume}
                      onFile={(f) => {
                        setResume(f);
                        setErrors((e) => ({ ...e, resume: undefined }));
                      }}
                      onClear={() => setResume(null)}
                      hasError={!!errors.resume}
                    />
                  </Field>
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {serverError}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Submit */}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed max-w-50">
                    By applying you agree to our{" "}
                    <span className="text-primary underline underline-offset-2 cursor-pointer">
                      terms of service
                    </span>
                    .
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    size="lg"
                    className="gap-2 shadow-[0_4px_24px_hsl(var(--gold)/0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_hsl(var(--gold)/0.5)] transition-all duration-300 disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit Application
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

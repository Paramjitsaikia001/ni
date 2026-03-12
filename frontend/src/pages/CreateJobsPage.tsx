import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createJob, type CreateJobPayload } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import Navbar from "../components/LandingPage/Navbar";
import { ArrowLeft, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { z } from "zod";
const jobSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  skills: z.array(z.string().trim().min(1)).min(1, "Add at least one skill"),
  experienceLevel: z.string().min(1, "Select experience level"),
  companyDetails: z
    .string()
    .trim()
    .min(1, "Company details required")
    .max(1000),
  expiresAt: z.string().min(1, "Expiry date required"),
});
const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Principal"];
export default function CreateJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [companyDetails, setCompanyDetails] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Job posted!",
        description: "Your job listing is now live.",
      });
      navigate("/jobs");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post job. Try again.",
        variant: "destructive",
      });
    },
  });
  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  }
  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }
  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const data: CreateJobPayload = {
      title,
      description,
      skills,
      experienceLevel,
      companyDetails,
      expiresAt: new Date(expiresAt).toISOString(),
    };
    const result = jobSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      /* @ts-ignore */
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(data);
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="apex-container max-w-2xl">
          <button
            onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </button>
          <div className="apex-tag">New Listing</div>
          <h1 className="apex-section-title text-[clamp(1.75rem,3vw,2.5rem)]">
            Post a Job
          </h1>
          <p className="apex-section-sub mb-10">
            Fill in the details to create a new job posting.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g. Senior React Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border"
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title}</p>
              )}
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary border-border"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  className="bg-secondary border-border"
                />
                <Button type="button" variant="secondary" onClick={addSkill}>
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.skills && (
                <p className="text-xs text-destructive">{errors.skills}</p>
              )}
            </div>
            {/* Experience Level */}
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select
                value={experienceLevel}
                onValueChange={setExperienceLevel}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.experienceLevel && (
                <p className="text-xs text-destructive">
                  {errors.experienceLevel}
                </p>
              )}
            </div>
            {/* Company Details */}
            <div className="space-y-2">
              <Label htmlFor="company">Company Details</Label>
              <Textarea
                id="company"
                placeholder="Brief company description, culture, perks..."
                rows={3}
                value={companyDetails}
                onChange={(e) => setCompanyDetails(e.target.value)}
                className="bg-secondary border-border"
              />
              {errors.companyDetails && (
                <p className="text-xs text-destructive">
                  {errors.companyDetails}
                </p>
              )}
            </div>
            {/* Expiry */}
            <div className="space-y-2">
              <Label htmlFor="expires">Expires At</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="bg-secondary border-border"
              />
              {errors.expiresAt && (
                <p className="text-xs text-destructive">{errors.expiresAt}</p>
              )}
            </div>
            {/* Submit */}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full shadow-[0_4px_24px_hsl(var(--gold)/0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_hsl(var(--gold)/0.5)] transition-all duration-300"
            >
              {mutation.isPending ? "Posting..." : "Post Job"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

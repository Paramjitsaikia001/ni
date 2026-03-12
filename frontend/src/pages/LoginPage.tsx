import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    if (isSignUp) {
      if (!fullName || !email) {
        setError("Full name and email are required for sign up.");
        return;
      }
    }

    setIsLoading(true);

    const endpoint = import.meta.env.VITE_BACKEND_ENDPOINT + (isSignUp ? "/auth/register" : "/auth/login");
    const payload = isSignUp
      ? { username, password, email, fullName }
      : { username, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // Store token in sessionStorage
      if (data.token) {
        sessionStorage.setItem("token", data.token);
      }

      // Redirect to dashboard (or wherever you want)
      navigate("/jobs");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when switching mode
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setFullName("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-end p-14">
        {/* Background layers */}
        <div className="absolute inset-0 bg-linear-to-br from-[hsl(var(--deep))] via-background to-[hsl(var(--surface))]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 30% 80%, black 20%, transparent 100%)",
          }}
        />
        <div className="absolute -top-30 -left-20 w-125 h-125 rounded-full bg-primary/[0.07] blur-[100px]" />
        <div className="absolute -bottom-25 right-[10%] w-100 h-100 rounded-full bg-teal/6 blur-[100px]" />
        <div className="absolute top-[40%] -right-15 w-75 h-75 rounded-full bg-lavender/5 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <Link to="/" className="flex items-center gap-3 group mb-16">
            <div className="w-9 h-9 bg-primary rounded-xl grid place-items-center transition-transform group-hover:rotate-12">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z"
                  fill="hsl(var(--ink))"
                />
              </svg>
            </div>
            <span className="font-head text-[1.5rem] text-secondary-foreground tracking-tight italic">
              HireGenie
            </span>
          </Link>

          <h1 className="font-head text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-white mb-6">
            Your next chapter
            <br />
            starts <em className="text-primary italic">right here.</em>
          </h1>
          <p className="text-muted-foreground text-[1.05rem] leading-relaxed max-w-md">
            Join 48,000+ professionals who found their dream role through 
            HireGenie.
          </p>

          {/* Stats row */}
          <div className="flex gap-12 mt-14 pt-8 border-t border-border">
            {[
              { num: "48k+", label: "Active Jobs" },
              { num: "12k+", label: "Companies" },
              { num: "96%", label: "Placement" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-head text-2xl text-white">
                  {s.num.replace(/[^0-9]/g, "")}
                  <span className="text-primary">
                    {s.num.replace(/[0-9]/g, "")}
                  </span>
                </div>
                <div className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-muted-foreground mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-100">
          {/* Mobile logo */}
          <Link
            to="/"
            className="flex items-center gap-2 mb-10 lg:hidden group"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
              Back
            </span>
          </Link>

          <div className="mb-10">
            <h2 className="font-head text-[2rem] text-white tracking-tight mb-2">
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground text-[0.92rem]">
              {isSignUp
                ? "Sign up to start applying to curated roles."
                : "Sign in to access your dashboard and applications."}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full name – only for sign up */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground text-sm">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 bg-surface border-border placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Username – always visible */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground text-sm">
                Username
              </Label>
              <Input
                id="username"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-surface border-border placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                disabled={isLoading}
              />
            </div>

            {/* Email – only for sign up */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-surface border-border placeholder:text-muted-foreground/50 focus-visible:ring-primary/40"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground text-sm">
                  Password
                </Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-gold-light transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-surface border-border placeholder:text-muted-foreground/50 pr-11 focus-visible:ring-primary/40"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-[0_4px_24px_hsl(var(--gold)/0.35)] hover:shadow-[0_8px_32px_hsl(var(--gold)/0.5)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social placeholder */}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border text-foreground hover:border-primary/40 hover:text-primary transition-all"
            onClick={(e) => e.preventDefault()}
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary font-medium hover:underline underline-offset-4"
              disabled={isLoading}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
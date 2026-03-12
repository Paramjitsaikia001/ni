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

// FIXED: Hardcoded endpoint to ensure it hits your port 5000 backend
    const baseUrl = import.meta.env.VITE_BACKEND_ENDPOINT + "/auth";
    const endpoint = isSignUp ? `${baseUrl}/register` : `${baseUrl}/login`;

    const payload = isSignUp
      ? { username, password, email, fullName }
      : { username, password };

    try {
      console.log(`🚀 Attempting ${isSignUp ? 'Registration' : 'Login'} at: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // Store token in localStorage (persists after refresh)
      if (data.token) {
        localStorage.setItem("token", data.token);
        // Optional: Store user info for the dashboard
        localStorage.setItem("user", JSON.stringify(data.user || data.data));
      }

console.log("✅ Success! Redirecting...");
      navigate("/dashboard");

    } catch (err: any) {
      console.error("❌ Auth Error:", err.message);
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
        
        <div className="relative z-10 max-w-lg">
          <Link to="/" className="flex items-center gap-3 group mb-16">
            <div className="w-9 h-9 bg-primary rounded-xl grid place-items-center transition-transform group-hover:rotate-12">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" fill="white" />
              </svg>
            </div>
            <span className="font-head text-[1.5rem] text-secondary-foreground tracking-tight italic">
              HireGenie
            </span>
          </Link>

          <h1 className="font-head text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-white mb-6">
            Your next chapter<br />starts <em className="text-primary italic">right here.</em>
          </h1>
          <p className="text-muted-foreground text-[1.05rem] leading-relaxed max-w-md">
            Join 48,000+ professionals who found their dream role through HireGenie.
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-100">
          <Link to="/" className="flex items-center gap-2 mb-10 lg:hidden group">
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Back</span>
          </Link>

          <div className="mb-10">
            <h2 className="font-head text-[2rem] text-white tracking-tight mb-2">
              {isSignUp ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground text-[0.92rem]">
              {isSignUp ? "Sign up to start applying to curated roles." : "Sign in to access your dashboard."}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 bg-surface" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 bg-surface" />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-surface" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-surface pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold">
              {isLoading ? "Connecting..." : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={toggleMode} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
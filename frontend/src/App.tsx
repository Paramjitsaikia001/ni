import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import { ScrollTrigger } from "gsap/all";
import gsap from "gsap";
import LoginPage from "./pages/LoginPage";
import JobsPage, { JobDetail } from "./pages/JobsPage";
import CreateJob from "./pages/CreateJobsPage";

// Register GSAP plugins for animations
gsap.registerPlugin(ScrollTrigger);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard & Jobs Routes 
              We add /dashboard as a redirect to /jobs to handle 
              the successful login navigation correctly.
          */}
          <Route path="/dashboard" element={<Navigate to="/jobs" replace />} />
          
          <Route path="/jobs" element={<JobsPage />}>
            {/* Nested route for specific job details */}
            <Route path=":id" element={<JobDetail />} />
          </Route>
          
          <Route path="/jobs/create" element={<CreateJob />} />

          {/* 404 Fallback - This handles any undefined routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
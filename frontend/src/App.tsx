import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import { ScrollTrigger } from "gsap/all";
import gsap from "gsap";
import LoginPage from "./pages/LoginPage";
import JobsPage, { JobDetail } from "./pages/JobsPage";
import CreateJob from "./pages/CreateJobsPage";
import Interview from "./pages/InterviewPage";

gsap.registerPlugin(ScrollTrigger);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="/jobs/create" element={<CreateJob />} />
          <Route path="/jobs" element={<JobsPage />} >
            <Route path=":id" element={<JobDetail />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

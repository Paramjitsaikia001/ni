// Fixed the base URL to include /api once - pointing to backend port 5000
const API_BASE = "http://localhost:5000/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  companyDetails: string;
  expiresAt: string;
  postedBy: string;
  createdAt?: string;
}

export interface CreateJobPayload {
  title: string;
  description: string;
  skills: string[];
  experienceLevel: string;
  companyDetails: string;
  expiresAt: string;
}

// --- Auth Functions ---

export async function registerUser(data: any) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }
  return res.json();
}

export async function loginUser(data: any) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Login failed");
  }
  return res.json();
}

// --- Job Functions ---

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: getAuthHeaders(),
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized: Please login again.");
    throw new Error("Failed to fetch jobs");
  }
  
  const result = await res.json();
  console.log("Backend Response for Jobs:", result);

  if (Array.isArray(result)) return result;
  if (result.data && Array.isArray(result.data)) return result.data;
  
  return []; 
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch job");
  const result = await res.json();
  return result.data || result;
}

export async function createJob(data: CreateJobPayload): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create job");
  const result = await res.json();
  return result.data || result;
}

// --- Application Functions ---

/**
 * Handles Job Application Submission
 * Note: 'data' should be an instance of FormData to handle the Resume file upload.
 */
export async function applyToJob(jobId: string, data: FormData) {
  const token = localStorage.getItem("token");
  
  const res = await fetch(`${API_BASE}/applications/apply/${jobId}`, {
    method: "POST",
    headers: {
      // IMPORTANT: We do NOT set 'Content-Type' for FormData/File uploads
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data, 
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Something went wrong while applying");
  }
  
  return res.json();
}
const API_BASE = import.meta.env.VITE_BACKEND_ENDPOINT;
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
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const payload: ApiResponse<Job[]> = await res.json();
  return payload.data;
}
export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch job");
  const payload: ApiResponse<Job> = await res.json();
  return payload.data;
}
export async function createJob(data: CreateJobPayload): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create job");
  return res.json();
}
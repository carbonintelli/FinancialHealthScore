import type { User } from "./types";

const TOKEN_KEY = "fhs_token";
const USER_KEY = "fhs_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function setAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/app/";
    throw new ApiError("Session expired", 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { detail?: string }).detail || `Error ${res.status}`, res.status);
  }
  return data as T;
}

export async function fetchHtmlReport(assessmentId: string): Promise<string> {
  const res = await fetch(`/api/v1/reports/${assessmentId}/html`, { headers: authHeaders() });
  if (res.status === 401) {
    clearAuth();
    window.location.href = "/app/";
    throw new ApiError("Session expired", 401);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { detail?: string }).detail || `Failed to load report (${res.status})`, res.status);
  }
  const html = await res.text();
  return URL.createObjectURL(new Blob([html], { type: "text/html" }));
}

export async function openHtmlReport(assessmentId: string) {
  const url = await fetchHtmlReport(assessmentId);
  window.open(url, "_blank");
}

export function homePathForUser(user: User): string {
  switch (user.organization_type) {
    case "bank":
      return "/bank/dashboard";
    case "msme":
      return "/msme/dashboard";
    case "government":
      return "/govt/dashboard";
    case "regulatory":
      return "/regulatory/dashboard";
    default:
      return "/";
  }
}

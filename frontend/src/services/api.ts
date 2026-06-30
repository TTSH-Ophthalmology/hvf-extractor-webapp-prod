/**
 * services/api.ts — Axios base instance.
 *
 * CONTROLLER layer (service sub-layer): all domain service files import this
 * instance rather than calling axios directly. Centralises base URL, default
 * headers, auth token injection, and error interceptors.
 */

import axios, { AxiosError, type AxiosInstance } from "axios";

// In development, use a relative base URL so all /api/* requests go through
// the Vite dev server proxy (vite.config.ts) → avoids CORS entirely.
// In production, set VITE_API_URL to the deployed backend origin (e.g. https://api.example.com).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length !== 2) {
    return null;
  }

  return parts.pop()?.split(";").shift() ?? null;
}

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();

  if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie("csrf_token");

    if (csrfToken) {
      config.headers.set("X-CSRF-Token", csrfToken);
    }
  }

  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original_request = error.config as any;
    const requestUrl = original_request?.url ?? "";
    const isAuthRequest =
      requestUrl.includes("/api/token") || requestUrl.includes("/api/refresh");

    if (error.response?.status == 401 && !original_request?._retry && !isAuthRequest) {
      original_request._retry = true;

      try {
        await api.post("/api/refresh");
        return api(original_request);
      } catch {
        window.location.href = "/token";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;

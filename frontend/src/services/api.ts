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

// Global error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original_request = error.config as any;
    const isRefresh_request= original_request?.url?.includes("/api/refresh")

    if (error.response?.status == 401 && !original_request?._retry && !isRefresh_request) {
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

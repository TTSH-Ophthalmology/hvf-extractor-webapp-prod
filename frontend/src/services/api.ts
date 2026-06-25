/**
 * services/api.ts — Axios base instance.
 *
 * CONTROLLER layer (service sub-layer): all domain service files import this
 * instance rather than calling axios directly. Centralises base URL, default
 * headers, auth token injection, and error interceptors.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios'

// In development, use a relative base URL so all /api/* requests go through
// the Vite dev server proxy (vite.config.ts) → avoids CORS entirely.
// In production, set VITE_API_URL to the deployed backend origin (e.g. https://api.example.com).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — inject auth token when present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      // TODO: redirect to login page when auth is implemented
    }
    return Promise.reject(error)
  }
)

export default api

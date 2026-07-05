/**
 * services/templateService.ts - API calls for report template JSON files.
 */

import api from './api'
import type { TemplateJson, TemplateListResponse, TemplateResponse } from '../models/template'

export async function listTemplates(signal?: AbortSignal): Promise<string[]> {
  const response = await api.get<TemplateListResponse>('/api/templates', { signal })
  return response.data.templates
}

export async function getTemplate(name: string, signal?: AbortSignal): Promise<TemplateResponse> {
  const response = await api.get<TemplateResponse>(`/api/templates/${encodeURIComponent(name)}`, {
    signal,
  })
  return response.data
}

export async function saveTemplate(name: string, content: TemplateJson): Promise<TemplateResponse> {
  const response = await api.put<TemplateResponse>(`/api/templates/${encodeURIComponent(name)}`, {
    content,
  })
  return response.data
}

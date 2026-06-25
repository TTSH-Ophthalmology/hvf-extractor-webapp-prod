/**
 * services/extractionService.ts — Raw API calls for HVF extraction.
 *
 * CONTROLLER layer (service sub-layer): no state, no React, pure async functions.
 * Consumed by the useExtraction hook.
 */

import api from './api'
import type { ExtractionResult } from '../models/extraction'

export async function triggerExtraction(
  jobId: string,
  eye: 'LE' | 'RE',
  reportType: string = 'hvf',
): Promise<ExtractionResult> {
  const response = await api.post<ExtractionResult>('/api/extract', null, {
    params: { job_id: jobId, eye, report_type: reportType },
  })
  return response.data
}

export async function getExtraction(jobId: string): Promise<ExtractionResult> {
  const response = await api.get<ExtractionResult>(`/api/extract/${jobId}`)
  return response.data
}

/**
 * services/pendingExtractions.ts — Tracks in-flight extraction requests in localStorage.
 *
 * If the browser never receives the POST /api/extract response (network drop,
 * tab closed, forced re-login mid-request), the result may still have been
 * computed and persisted server-side. These markers let the app check
 * GET /api/extract/{job_id} for a recoverable result on next load.
 */

import type { EyeCode } from '../components/extraction/types'
import type { ExtractionReportType } from '../context/ExtractionWorkflowContext'

const STORAGE_KEY = 'hvf-pending-extractions'

export type PendingExtraction = {
  jobId: string
  eye: EyeCode
  filename: string
  reportType: ExtractionReportType
}

const readAll = (): PendingExtraction[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeAll = (entries: PendingExtraction[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — recovery is best-effort
  }
}

export const markExtractionPending = (entry: PendingExtraction) => {
  const entries = readAll().filter((existing) => existing.jobId !== entry.jobId)
  entries.push(entry)
  writeAll(entries)
}

export const clearPendingExtraction = (jobId: string) => {
  writeAll(readAll().filter((existing) => existing.jobId !== jobId))
}

export const takePendingExtractions = (): PendingExtraction[] => {
  const entries = readAll()
  writeAll([])
  return entries
}

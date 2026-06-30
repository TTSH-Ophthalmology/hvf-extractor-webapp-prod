/**
 * hooks/useExtraction.ts — CONTROLLER layer: manages extraction state for one eye.
 *
 * Triggers extraction for an uploaded file and polls until complete/error.
 * Instantiate one hook per eye (LE and RE are independent).
 */

import { useCallback, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'
import { triggerExtraction, getExtraction } from '../services/extractionService'

const POLL_INTERVAL_MS = 2000

type ExtractionStatus = 'idle' | 'extracting' | 'complete' | 'error'

interface UseExtractionResult {
  status: ExtractionStatus
  data: ExtractionResult | null
  errorMessage: string | null
  extract: (jobId: string, eye: 'LE' | 'RE', reportType: string) => Promise<ExtractionResult | null>
  reset: () => void
}

export function useExtraction(): UseExtractionResult {
  const [status, setStatus] = useState<ExtractionStatus>('idle')
  const [data, setData] = useState<ExtractionResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const extract = useCallback(async (jobId: string, eye: 'LE' | 'RE', reportType: string) => {
    setStatus('extracting')
    setErrorMessage(null)
    setData(null)

    try {
      const result = await triggerExtraction(jobId, eye, reportType)
      setData(result)

      if (result.status === 'complete') {
        setStatus('complete')
        return result
      }

      // Poll if extraction is still in progress (future async jobs)
      let cancelled = false
      const poll = async () => {
        try {
          const polled = await getExtraction(result.job_id)
          if (cancelled) return
          setData(polled)
          if (polled.status === 'complete') {
            setStatus('complete')
          } else if (polled.status === 'error') {
            setStatus('error')
            setErrorMessage(polled.error_message ?? 'Extraction failed')
          } else {
            setTimeout(poll, POLL_INTERVAL_MS)
          }
        } catch (err) {
          if (!cancelled) {
            setStatus('error')
            setErrorMessage(err instanceof Error ? err.message : 'Polling failed')
          }
        }
      }

      if (result.status !== 'error') {
        setTimeout(poll, POLL_INTERVAL_MS)
        return null
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Extraction failed')
    }

    return null
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
    setErrorMessage(null)
  }, [])

  return { status, data, errorMessage, extract, reset }
}

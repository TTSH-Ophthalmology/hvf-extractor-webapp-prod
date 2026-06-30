/**
 * hooks/usePDFUpload.ts — CONTROLLER layer: manages file upload state.
 *
 * Encapsulates the upload lifecycle: idle → uploading → success | error.
 * Accepts PDF, JPG, JPEG, PNG files (matching backend validation).
 * Components call this hook and render based on the returned state.
 */

import { useCallback, useState } from 'react'
import type { FileUploadResponse } from '../models/pdf'
import { uploadFile } from '../services/pdfService'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UsePDFUploadResult {
  status: UploadStatus
  response: FileUploadResponse | null
  errorMessage: string | null
  upload: (file: File) => Promise<FileUploadResponse | null>
  reset: () => void
}

export function usePDFUpload(): UsePDFUploadResult {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [response, setResponse] = useState<FileUploadResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const upload = useCallback(async (file: File) => {
    setStatus('uploading')
    setErrorMessage(null)
    setResponse(null)
    try {
      const result = await uploadFile(file)
      setResponse(result)
      setStatus('success')
      return result
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResponse(null)
    setErrorMessage(null)
  }, [])

  return { status, response, errorMessage, upload, reset }
}

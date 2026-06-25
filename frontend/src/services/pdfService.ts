/**
 * services/pdfService.ts — Raw API calls for file upload.
 *
 * CONTROLLER layer (service sub-layer): no state, no React, pure async functions.
 * Accepts PDF, JPG, JPEG, PNG files. Consumed by the usePDFUpload hook.
 */

import api from './api'
import type { FileUploadResponse } from '../models/pdf'

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<FileUploadResponse>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data
}

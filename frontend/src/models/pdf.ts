/**
 * models/pdf.ts — TypeScript mirror of backend FileUploadResponse.
 *
 * MODEL layer: pure data shape, no methods.
 * Keep in sync with backend/app/models/pdf.py :: FileUploadResponse.
 */

export interface FileUploadResponse {
  status: string
  job_id: string
  filename: string
  size: number
  message: string
}

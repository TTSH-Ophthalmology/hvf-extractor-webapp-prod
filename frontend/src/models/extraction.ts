/**
 * models/extraction.ts — TypeScript mirrors of backend Pydantic extraction schemas.
 *
 * MODEL layer: pure data shapes, no methods, no business logic.
 * Keep in sync with backend/app/models/extraction.py.
 */

export interface ExtractionResult {
  job_id: string
  filename: string
  eye: string | null
  status: 'pending' | 'processing' | 'complete' | 'error'
  /** Flat key-value pairs extracted from the PDF (field_name → value). */
  raw_data: Record<string, string>
  error_message: string | null
}

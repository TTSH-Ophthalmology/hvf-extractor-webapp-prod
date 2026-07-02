import { ResultCsvExtractionDataPreview } from '../ResultCsvExtractionDataPreview/ResultCsvExtractionDataPreview'
import { ResultJsonExtractionDataPreview } from '../ResultJsonExtractionDataPreview/ResultJsonExtractionDataPreview'
import type { EyeCode } from '../types'
import './ResultExtractionDataPreview.css'

export type PreviewMode = 'csv' | 'json'

export type ResultExtractionDataRow = {
  eye: EyeCode
  label: string
  rawData: Record<string, string>
}

type ResultExtractionDataPreviewProps = {
  mode: PreviewMode
  rows: ResultExtractionDataRow[]
  fieldNames: string[]
  uploadedFiles: Record<EyeCode, File | null>
}

export const ResultExtractionDataPreview = ({
  mode,
  rows,
  fieldNames,
  uploadedFiles,
}: ResultExtractionDataPreviewProps) => {
  if (mode === 'json') {
    return (
      <ResultJsonExtractionDataPreview
        rows={rows}
        uploadedFiles={uploadedFiles}
      />
    )
  }

  return (
    <ResultCsvExtractionDataPreview
      rows={rows}
      fieldNames={fieldNames}
      uploadedFiles={uploadedFiles}
    />
  )
}

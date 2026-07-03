import { ResultCsvExtractionDataPreview } from '../ResultCsvExtractionDataPreview/ResultCsvExtractionDataPreview'
import type { EyeCode } from '../types'
import './ResultExtractionDataPreview.css'

export type ResultExtractionDataRow = {
  id: string
  eye: EyeCode
  label: string
  filename: string
  rawData: Record<string, string>
}

type ResultExtractionDataPreviewProps = {
  rows: ResultExtractionDataRow[]
  fieldNames: string[]
}

export const ResultExtractionDataPreview = ({
  rows,
  fieldNames,
}: ResultExtractionDataPreviewProps) => {
  return (
    <ResultCsvExtractionDataPreview
      rows={rows}
      fieldNames={fieldNames}
    />
  )
}

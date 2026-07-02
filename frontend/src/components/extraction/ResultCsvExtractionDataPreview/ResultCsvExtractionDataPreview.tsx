import { ResultEyePreviewBox } from '../ResultEyePreviewBox/ResultEyePreviewBox'
import type { ResultExtractionDataRow } from '../ResultExtractionDataPreview/ResultExtractionDataPreview'
import type { EyeCode } from '../types'

type ResultCsvExtractionDataPreviewProps = {
  rows: ResultExtractionDataRow[]
  fieldNames: string[]
  uploadedFiles: Record<EyeCode, File | null>
}

const formatFieldName = (fieldName: string) =>
  fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

export const ResultCsvExtractionDataPreview = ({
  rows,
  fieldNames,
  uploadedFiles,
}: ResultCsvExtractionDataPreviewProps) => {
  return (
    <ResultEyePreviewBox rows={rows} uploadedFiles={uploadedFiles}>
      <div className="result-preview-eye-content">
        <div className="result-table-wrap">
          <table className="result-data-table">
            <thead>
              <tr>
                <th>Eye</th>
                {fieldNames.map((fieldName) => (
                  <th key={fieldName}>{formatFieldName(fieldName)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eye}>
                  <th scope="row">{row.eye}</th>
                  {fieldNames.map((fieldName) => (
                    <td key={fieldName}>{row.rawData[fieldName] || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ResultEyePreviewBox>
  )
}

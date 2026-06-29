import type { EyeCode } from './types'
import './ResultExtractionDataPreview.css'

export type PreviewMode = 'csv' | 'json'

export type ResultExtractionDataRow = {
  eye: EyeCode
  rawData: Record<string, string>
}

type ResultExtractionDataPreviewProps = {
  mode: PreviewMode
  rows: ResultExtractionDataRow[]
  fieldNames: string[]
}

const formatFieldName = (fieldName: string) =>
  fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

export const ResultExtractionDataPreview = ({
  mode,
  rows,
  fieldNames,
}: ResultExtractionDataPreviewProps) => {
  if (mode === 'json') {
    const jsonPreview = rows.reduce(
      (acc, row) => ({
        ...acc,
        [row.eye]: row.rawData,
      }),
      {} as Record<EyeCode, Record<string, string>>
    )

    return (
      <div className="result-preview-eye-content">
        <pre className="result-json-preview">
          {JSON.stringify(jsonPreview, null, 2)}
        </pre>
      </div>
    )
  }

  return (
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
  )
}

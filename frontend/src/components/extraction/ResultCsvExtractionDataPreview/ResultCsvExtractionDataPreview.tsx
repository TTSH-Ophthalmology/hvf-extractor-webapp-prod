import type { ResultExtractionDataRow } from '../ResultExtractionDataPreview/ResultExtractionDataPreview'

type ResultCsvExtractionDataPreviewProps = {
  rows: ResultExtractionDataRow[]
  fieldNames: string[]
}

const formatFieldName = (fieldName: string) =>
  fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

export const ResultCsvExtractionDataPreview = ({
  rows,
  fieldNames,
}: ResultCsvExtractionDataPreviewProps) => {
  return (
    <div className="result-preview-csv-content">
      <div className="result-table-wrap">
        <table className="result-data-table">
          <thead>
            <tr>
              <th>Eye</th>
              <th>File</th>
              {fieldNames.map((fieldName) => (
                <th key={fieldName}>{formatFieldName(fieldName)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.eye}</th>
                <td>{row.filename}</td>
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

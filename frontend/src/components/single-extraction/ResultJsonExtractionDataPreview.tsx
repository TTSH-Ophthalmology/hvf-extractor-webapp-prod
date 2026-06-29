import { EyeBox } from './EyeBox'
import { FilePreview } from './FilePreview'
import type { EyeCode } from './types'
import type { ResultExtractionDataRow } from './ResultExtractionDataPreview'

type ResultJsonExtractionDataPreviewProps = {
  rows: ResultExtractionDataRow[]
  uploadedFiles: Record<EyeCode, File | null>
}

const eyeLabels: Record<EyeCode, string> = {
  LE: 'Left Eye',
  RE: 'Right Eye',
}

const eyeOrder: EyeCode[] = ['LE', 'RE']

export const ResultJsonExtractionDataPreview = ({
  rows,
  uploadedFiles,
}: ResultJsonExtractionDataPreviewProps) => {
  const rowsByEye = rows.reduce(
    (acc, row) => ({
      ...acc,
      [row.eye]: row,
    }),
    {} as Partial<Record<EyeCode, ResultExtractionDataRow>>
  )

  return (
    <div className="result-json-eye-grid">
      {eyeOrder.map((eye) => {
        const row = rowsByEye[eye]

        return (
          <EyeBox
            key={eye}
            abbreviation={eye}
            label={row?.label ?? eyeLabels[eye]}
            hasSelectedFile={false}
            headerAction={
              row ? (
                <div className="result-json-header-file">
                  <FilePreview selectedFile={uploadedFiles[eye]} />
                </div>
              ) : undefined
            }
          >
            <div className="result-preview-eye-content">
              {row ? (
                <pre className="result-json-preview">
                  {JSON.stringify({ [row.eye]: row.rawData }, null, 2)}
                </pre>
              ) : (
                <div className="result-json-empty-state">
                  <span className="result-json-empty-mark" aria-hidden="true">
                    {eye}
                  </span>
                  <strong>No data extracted</strong>
                  <span>Run extraction for this eye to preview JSON data.</span>
                </div>
              )}
            </div>
          </EyeBox>
        )
      })}
    </div>
  )
}

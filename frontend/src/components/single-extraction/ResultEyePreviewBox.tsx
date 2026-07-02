import { Fragment, type ReactNode } from 'react'
import { EyeBox } from './EyeBox'
import { FilePreview } from './FilePreview'
import type { EyeCode } from './types'
import './ResultEyePreviewBox.css'

export type ResultEyePreviewRow = {
  eye: EyeCode
  label: string
}

type ResultEyePreviewBoxProps = {
  rows: ResultEyePreviewRow[]
  uploadedFiles: Record<EyeCode, File | null>
  children: ReactNode
}

export const ResultEyePreviewBox = ({
  rows,
  uploadedFiles,
  children,
}: ResultEyePreviewBoxProps) => {
  const firstRow = rows[0]
  const hasBothEyes = rows.length > 1

  if (!firstRow) return null

  return (
    <div className="result-preview-eye-box">
      <EyeBox
        abbreviation={firstRow.eye}
        label={firstRow.label}
        hasSelectedFile={false}
        headerTitle={
          <div className="result-eye-title-list">
            {hasBothEyes ? (
              <span className="result-eye-title-item">
                <span className="eye-code">OU</span>
                <span>Both Eyes</span>
              </span>
            ) : (
              <span className="result-eye-title-item">
                <span className="eye-code">{firstRow.eye}</span>
                <span>{firstRow.label}</span>
              </span>
            )}
          </div>
        }
        headerAction={
          <div className="result-preview-header-files">
            {rows.map((row, index) => (
              <Fragment key={row.eye}>
                <div className="result-preview-header-file">
                  <FilePreview selectedFile={uploadedFiles[row.eye]} />
                </div>
                {index < rows.length - 1 && (
                  <span className="result-preview-file-divider" aria-hidden="true">|</span>
                )}
              </Fragment>
            ))}
          </div>
        }
      >
        {children}
      </EyeBox>
    </div>
  )
}

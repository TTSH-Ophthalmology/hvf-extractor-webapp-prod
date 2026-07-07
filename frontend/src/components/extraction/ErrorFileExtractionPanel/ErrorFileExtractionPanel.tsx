import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FaExclamationTriangle } from 'react-icons/fa'
import type { SkippedExtractionFile } from '../../../context/ExtractionWorkflowContext'
import { ErrorFilePreview } from '../ErrorFilePreview/ErrorFilePreview'
import './ErrorFileExtractionPanel.css'

type ErrorFileExtractionPanelProps = {
  files: SkippedExtractionFile[]
}

export const ErrorFileExtractionPanel = ({
  files,
}: ErrorFileExtractionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const skippedFileCountText = `${files.length} File(s) Skipped`

  if (files.length === 0) {
    return null
  }

  return (
    <section className="error-file-extraction-panel" aria-label="Skipped files">
      <button
        className="error-file-extraction-toggle"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((currentValue) => !currentValue)}
      >
        <span className="error-file-extraction-title">
          <FaExclamationTriangle size={20} aria-hidden="true" />
          <span>{skippedFileCountText}</span>
        </span>
        <ChevronDown
          className={`error-file-extraction-chevron${isExpanded ? ' error-file-extraction-chevron-open' : ''}`}
          size={24}
          strokeWidth={3}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="error-file-extraction-list">
          {files.map((file) => (
            <ErrorFilePreview
              key={file.id}
              filename={file.filename}
              size={file.size}
              reason={file.reason}
            />
          ))}
        </div>
      )}
    </section>
  )
}

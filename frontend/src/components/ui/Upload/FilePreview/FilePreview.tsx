import type { KeyboardEvent, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import './FilePreview.css'

type FilePreviewProps = {
  selectedFile?: File | null
  selectedFiles?: File[]
  onClearFile?: (fileIndex: number) => void
}

export const FilePreview = ({
  selectedFile,
  selectedFiles,
  onClearFile,
}: FilePreviewProps) => {
  const files = selectedFiles ?? (selectedFile ? [selectedFile] : [])

  if (files.length === 0) {
    return (
      <div className="selected-file-row">
        <FaRegFileLines size={16} />
        <strong>No file uploaded</strong>
      </div>
    )
  }

  const openSelectedFile = (file: File) => {
    const fileUrl = URL.createObjectURL(file)
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, file: File) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSelectedFile(file)
    }
  }

  const handleClearFile = (e: MouseEvent<HTMLButtonElement>, fileIndex: number) => {
    e.stopPropagation()
    onClearFile?.(fileIndex)
  }

  return (
    <div className={`selected-file-stack${files.length > 5 ? ' selected-file-stack-scrollable' : ''}`}>
      {files.map((file, index) => {
        const fileSizeMb = `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        const fileKey = `${file.name}-${file.size}-${file.lastModified}-${index}`

        return (
          <div
            key={fileKey}
            className="selected-file-card selected-file-card-clickable"
            role="button"
            tabIndex={0}
            aria-label={`Open ${file.name}`}
            onClick={() => openSelectedFile(file)}
            onKeyDown={(e) => handleKeyDown(e, file)}
          >
            <div className="selected-file-icon" aria-hidden="true">
              <FaRegFilePdf size={16} />
            </div>
            <div className="selected-file-details">
              <strong>{file.name}</strong>
              <span>{fileSizeMb}</span>
            </div>
            {onClearFile && (
              <button
                className="selected-file-remove"
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => handleClearFile(e, index)}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

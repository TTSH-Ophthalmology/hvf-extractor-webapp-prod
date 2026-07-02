import type { KeyboardEvent, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import './FilePreview.css'

type FilePreviewProps = {
  selectedFile: File | null
  onClearFile?: () => void
}

export const FilePreview = ({
  selectedFile,
  onClearFile,
}: FilePreviewProps) => {
  if (!selectedFile) {
    return (
      <div className="selected-file-row">
        <FaRegFileLines size={16} />
        <strong>No file uploaded</strong>
      </div>
    )
  }

  const fileSizeMb = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`

  const openSelectedFile = () => {
    const fileUrl = URL.createObjectURL(selectedFile)
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openSelectedFile()
    }
  }

  const handleClearFile = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClearFile?.()
  }

  return (
    <div
      className="selected-file-card selected-file-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Open ${selectedFile.name}`}
      onClick={openSelectedFile}
      onKeyDown={handleKeyDown}
    >
      <div className="selected-file-icon" aria-hidden="true">
        <FaRegFilePdf size={16} />
      </div>
      <div className="selected-file-details">
        <strong>{selectedFile.name}</strong>
        <span>{fileSizeMb}</span>
      </div>
      {onClearFile && (
        <button
          className="selected-file-remove"
          type="button"
          aria-label={`Remove ${selectedFile.name}`}
          onClick={handleClearFile}
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

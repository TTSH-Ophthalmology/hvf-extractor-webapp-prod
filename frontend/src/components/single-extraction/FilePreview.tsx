import { X } from 'lucide-react'
import { FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import type { SelectedFile } from './types'

type FilePreviewProps = {
  selectedFile: SelectedFile | null
  onClearFile: () => void
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

  return (
    <div className="selected-file-card">
      <div className="selected-file-icon" aria-hidden="true">
        <FaRegFilePdf size={16} />
      </div>
      <div className="selected-file-details">
        <strong>{selectedFile.name}</strong>
        <span>{fileSizeMb}</span>
      </div>
      <button
        className="selected-file-remove"
        type="button"
        aria-label={`Remove ${selectedFile.name}`}
        onClick={onClearFile}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}

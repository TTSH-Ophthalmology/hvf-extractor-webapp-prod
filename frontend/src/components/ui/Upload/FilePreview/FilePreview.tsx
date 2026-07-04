import type { KeyboardEvent, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa'
import { FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import { RiFileWarningLine } from 'react-icons/ri'
import './FilePreview.css'

export type FilePreviewItem = {
  name: string
  size: number
  lastModified?: number
  errorReason?: string
}

type FilePreviewProps = {
  selectedFile?: File | null
  selectedFiles?: File[]
  files?: FilePreviewItem[]
  onClearFile?: (fileIndex: number) => void
  variant?: 'default' | 'error'
}

export const FilePreview = ({
  selectedFile,
  selectedFiles,
  files: previewFiles,
  onClearFile,
  variant = 'default',
}: FilePreviewProps) => {
  const files = previewFiles ?? selectedFiles ?? (selectedFile ? [selectedFile] : [])
  const isErrorVariant = variant === 'error'
  const isPdfFile = (file: FilePreviewItem | File) =>
    file.name.toLowerCase().endsWith('.pdf')

  if (files.length === 0) {
    return (
      <div className="selected-file-row">
        <FaRegFileLines size={16} />
        <strong>No file uploaded</strong>
      </div>
    )
  }

  const isBrowserFile = (file: FilePreviewItem | File): file is File => {
    return file instanceof File
  }

  const openSelectedFile = (file: FilePreviewItem | File) => {
    if (!isBrowserFile(file)) {
      return
    }

    const fileUrl = URL.createObjectURL(file)
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, file: FilePreviewItem | File) => {
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
    <div className={`selected-file-stack${isErrorVariant ? ' selected-file-stack-error' : ''}${files.length > 5 ? ' selected-file-stack-scrollable' : ''}`}>
      {files.map((file, index) => {
        const fileSizeMb = `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        const fileKey = `${file.name}-${file.size}-${file.lastModified ?? 'preview'}-${index}`
        const isClickable = isBrowserFile(file) && !isErrorVariant
        const errorReason = 'errorReason' in file ? file.errorReason : undefined
        const isWarningFile = !isErrorVariant && (!isPdfFile(file) || Boolean(errorReason))

        return (
          <div
            key={fileKey}
            className={`selected-file-card${isErrorVariant ? ' selected-file-card-error' : ''}${isClickable ? ' selected-file-card-clickable' : ''}`}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={isClickable ? `Open ${file.name}` : undefined}
            onClick={isClickable ? () => openSelectedFile(file) : undefined}
            onKeyDown={isClickable ? (e) => handleKeyDown(e, file) : undefined}
          >
            <div className={`selected-file-icon${isWarningFile ? ' selected-file-icon-warning' : ''}${isErrorVariant ? ' selected-file-icon-error' : ''}`} aria-hidden="true">
              {isErrorVariant ? (
                <RiFileWarningLine size={20} />
              ) : isWarningFile ? (
                <FaExclamationTriangle size={16} />
              ) : (
                <FaRegFilePdf size={16} />
              )}
            </div>
            <div className="selected-file-details">
              <strong>{file.name}</strong>
              <span>{fileSizeMb}</span>
            </div>
            {isErrorVariant && errorReason && (
              <span className="selected-file-error-reason">{errorReason}</span>
            )}
            {isErrorVariant ? (
              <FaTimesCircle
                className="selected-file-error-icon"
                size={24}
                aria-hidden="true"
              />
            ) : onClearFile && (
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

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { MdOutlineCloudUpload } from 'react-icons/md'

type FileDropzoneProps = {
  inputId: string
  isUploading: boolean
  onFilesSelected: (files: File[]) => void
}

export const FileDropzone = ({
  inputId,
  isUploading,
  onFilesSelected,
}: FileDropzoneProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    e.target.value = ''
  }

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingFile(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDraggingFile(false)

    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    e.dataTransfer.clearData()
  }

  return (
    <label
      className={`file-dropzone${isDraggingFile ? ' file-dropzone-dragging' : ''}`}
      htmlFor={inputId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-icon-box">
        <MdOutlineCloudUpload size={24} />
      </div>
      <p>Drag and drop files here</p>
      <span>Supported: PDF (Max 200 MB)</span>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleChange}
        disabled={isUploading}
        style={{ display: 'none' }}
      />
      <span className="browse-button" role="button" aria-label="Browse files">
        Browse files
      </span>
    </label>
  )
}

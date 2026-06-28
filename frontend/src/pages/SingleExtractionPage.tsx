/**
 * pages/SingleExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { useRef, useState } from 'react'
import { FaEye, FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import { MdOutlineCloudUpload } from 'react-icons/md'
import { X } from 'lucide-react'
import { RiEyeCloseFill, RiSearchEyeLine } from 'react-icons/ri'
import { ReportTypeSelector, type ReportType } from '../components/ui/ReportTypeSelector'
import { usePDFUpload } from '../hooks/usePDFUpload'
import { useExtraction } from '../hooks/useExtraction'
import type { FileUploadResponse } from '../models/pdf'
import './SingleExtractionPage.css'

const reportTypeOptions = [
  { value: 'hvf',  label: 'HVF (Humphrey Visual Field)',        abbreviation: 'HVF'  },
  { value: 'vrvf', label: 'VRVF (Virtual Reality Visual Field)', abbreviation: 'VRVF' },
] satisfies Array<{ value: ReportType; label: string; abbreviation: string }>

type Eye = 'LE' | 'RE'

type EyeUploadPanelProps = {
  abbreviation: Eye
  label: string
  onFileSelected: (file: File) => void
  onClearFile: () => void
  isUploading: boolean
  selectedFile: FileUploadResponse | null
}

const EyeUploadPanel = ({
  abbreviation,
  label,
  onFileSelected,
  onClearFile,
  isUploading,
  selectedFile,
}: EyeUploadPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingFile(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDraggingFile(false)

    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
    e.dataTransfer.clearData()
  }

  const handleClearFile = () => {
    onClearFile()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fileSizeMb = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : null

  return (
    <section
      className={`eye-upload-panel${selectedFile ? ' eye-upload-panel-uploaded' : ''}`}
      aria-labelledby={`${abbreviation}-title`}
    >
      <header className="eye-upload-header">
        <div className="eye-upload-title" id={`${abbreviation}-title`}>
          <span className="eye-code">{abbreviation}</span>
          <span>{label}</span>
        </div>
        {selectedFile ? (
          <FaEye className="eye-status-mark" aria-hidden="true" />
        ) : (
          <RiEyeCloseFill className="eye-status-mark" aria-hidden="true" />
        )}
      </header>

      <label
        className={`file-dropzone${isDraggingFile ? ' file-dropzone-dragging' : ''}`}
        htmlFor={`file-input-${abbreviation}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon-box">
          <MdOutlineCloudUpload size={24} />
        </div>
        <p>Drag and drop file here</p>
        <span>Supported: PDF (Max 200 MB)</span>
        <input
          ref={fileInputRef}
          id={`file-input-${abbreviation}`}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />
        <span className="browse-button" role="button" aria-label="Browse files">
          Browse files
        </span>
      </label>

      {selectedFile ? (
        <div className="selected-file-card">
          <div className="selected-file-icon" aria-hidden="true">
            <FaRegFilePdf size={16} />
          </div>
          <div className="selected-file-details">
            <strong>{selectedFile.filename}</strong>
            <span>{fileSizeMb}</span>
          </div>
          <button
            className="selected-file-remove"
            type="button"
            aria-label={`Remove ${selectedFile.filename}`}
            onClick={handleClearFile}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div className="selected-file-row">
          <FaRegFileLines size={16} />
          <strong>No file uploaded</strong>
        </div>
      )}
    </section>
  )
}

export const SingleExtractionPage = () => {
  const [reportType, setReportType] = useState<ReportType>('hvf')

  const leftEye  = usePDFUpload()
  const rightEye = usePDFUpload()

  const leftExtraction  = useExtraction()
  const rightExtraction = useExtraction()

  const canExtract =
    (leftEye.status === 'success' || rightEye.status === 'success') &&
    leftExtraction.status  === 'idle' &&
    rightExtraction.status === 'idle'

  const isExtracting =
    leftExtraction.status  === 'extracting' ||
    rightExtraction.status === 'extracting'

  const handleExtract = async () => {
    const tasks: Promise<void>[] = []

    if (leftEye.response?.job_id) {
      tasks.push(leftExtraction.extract(leftEye.response.job_id, 'LE', reportType))
    }
    if (rightEye.response?.job_id) {
      tasks.push(rightExtraction.extract(rightEye.response.job_id, 'RE', reportType))
    }

    await Promise.all(tasks)
  }

  const uploadError = leftEye.errorMessage ?? rightEye.errorMessage
  const extractionError = leftExtraction.errorMessage ?? rightExtraction.errorMessage

  return (
    <div className="single-extraction-page">
      <ReportTypeSelector options={reportTypeOptions} value={reportType} onChange={setReportType} />

      <div className="eye-upload-grid">
        <EyeUploadPanel
          abbreviation="LE"
          label="Left Eye"
          onFileSelected={leftEye.upload}
          onClearFile={leftEye.reset}
          isUploading={leftEye.status === 'uploading'}
          selectedFile={leftEye.response}
        />
        <EyeUploadPanel
          abbreviation="RE"
          label="Right Eye"
          onFileSelected={rightEye.upload}
          onClearFile={rightEye.reset}
          isUploading={rightEye.status === 'uploading'}
          selectedFile={rightEye.response}
        />
      </div>

      {uploadError && (
        <p className="extraction-error" role="alert">{uploadError}</p>
      )}

      <div className="extraction-action-row">
        <button
          className="run-extraction-button"
          type="button"
          disabled={!canExtract || isExtracting}
          onClick={handleExtract}
          style={canExtract && !isExtracting ? { background: '#00336a' } : undefined}
        >
          <RiSearchEyeLine size={18} />
          {isExtracting ? 'Extracting...' : 'Run Extraction'}
        </button>
      </div>

      {extractionError && (
        <p className="extraction-error" role="alert">{extractionError}</p>
      )}

      {(leftExtraction.data || rightExtraction.data) && (
        <section className="extraction-results" aria-label="Extraction results">
          {([
            { eye: 'LE' as Eye, result: leftExtraction.data },
            { eye: 'RE' as Eye, result: rightExtraction.data },
          ]).map(({ eye, result }) =>
            result ? (
              <article className="extraction-result-panel" key={eye}>
                <h2>{eye} Result</h2>
                <pre>{JSON.stringify(result.raw_data, null, 2)}</pre>
              </article>
            ) : null
          )}
        </section>
      )}
    </div>
  )
}

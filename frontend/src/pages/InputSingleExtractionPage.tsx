/**
 * pages/InputSingleExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaRegFileLines, FaRegFilePdf } from 'react-icons/fa6'
import { MdOutlineCloudUpload } from 'react-icons/md'
import { X } from 'lucide-react'
import { RiEyeCloseFill, RiSearchEyeLine } from 'react-icons/ri'
import { ReportTypeSelector, type ReportType } from '../components/ui/ReportTypeSelector'
import { usePDFUpload } from '../hooks/usePDFUpload'
import { useExtraction } from '../hooks/useExtraction'
import { useSingleExtractionWorkflow } from '../context/SingleExtractionWorkflowContext'
import type { ExtractionResult } from '../models/extraction'
import './InputSingleExtractionPage.css'

const reportTypeOptions = [
  { value: 'hvf',  label: 'HVF (Humphrey Visual Field)',        abbreviation: 'HVF'  },
  { value: 'vrvf', label: 'VRVF (Virtual Reality Visual Field)', abbreviation: 'VRVF' },
] satisfies Array<{ value: ReportType; label: string; abbreviation: string }>

type Eye = 'LE' | 'RE'

type SelectedFile = {
  name: string
  size: number
}

type EyeUploadPanelProps = {
  abbreviation: Eye
  label: string
  onFileSelected: (file: File) => void
  onClearFile: () => void
  isUploading: boolean
  selectedFile: SelectedFile | null
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
            <strong>{selectedFile.name}</strong>
            <span>{fileSizeMb}</span>
          </div>
          <button
            className="selected-file-remove"
            type="button"
            aria-label={`Remove ${selectedFile.name}`}
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

export const InputSingleExtractionPage = () => {
  const navigate = useNavigate()
  const { setResults, clearResults } = useSingleExtractionWorkflow()
  const [reportType, setReportType] = useState<ReportType>('hvf')
  const [leftSelectedFile, setLeftSelectedFile] = useState<File | null>(null)
  const [rightSelectedFile, setRightSelectedFile] = useState<File | null>(null)

  const leftEye  = usePDFUpload()
  const rightEye = usePDFUpload()

  const leftExtraction  = useExtraction()
  const rightExtraction = useExtraction()

  const hasSelectedFile = Boolean(leftSelectedFile || rightSelectedFile)

  const isExtracting =
    leftExtraction.status  === 'extracting' ||
    rightExtraction.status === 'extracting'

  const isUploading =
    leftEye.status  === 'uploading' ||
    rightEye.status === 'uploading'

  const canExtract = hasSelectedFile && !isUploading && !isExtracting

  const handleLeftFileSelected = useCallback((file: File) => {
    setLeftSelectedFile(file)
    clearResults()
    leftExtraction.reset()
    leftEye.upload(file)
  }, [clearResults, leftEye, leftExtraction])

  const handleRightFileSelected = useCallback((file: File) => {
    setRightSelectedFile(file)
    clearResults()
    rightExtraction.reset()
    rightEye.upload(file)
  }, [clearResults, rightEye, rightExtraction])

  const handleClearLeftFile = useCallback(() => {
    setLeftSelectedFile(null)
    clearResults()
    leftEye.reset()
    leftExtraction.reset()
  }, [clearResults, leftEye, leftExtraction])

  const handleClearRightFile = useCallback(() => {
    setRightSelectedFile(null)
    clearResults()
    rightEye.reset()
    rightExtraction.reset()
  }, [clearResults, rightEye, rightExtraction])

  const handleExtract = async () => {
    const tasks: Promise<{ eye: Eye; result: ExtractionResult | null }>[] = []

    let leftJobId = leftEye.response?.job_id
    if (!leftJobId && leftSelectedFile) {
      const uploaded = await leftEye.upload(leftSelectedFile)
      leftJobId = uploaded?.job_id
    }

    let rightJobId = rightEye.response?.job_id
    if (!rightJobId && rightSelectedFile) {
      const uploaded = await rightEye.upload(rightSelectedFile)
      rightJobId = uploaded?.job_id
    }

    if (leftJobId) {
      tasks.push(
        leftExtraction
          .extract(leftJobId, 'LE', reportType)
          .then((result) => ({ eye: 'LE' as Eye, result }))
      )
    }
    if (rightJobId) {
      tasks.push(
        rightExtraction
          .extract(rightJobId, 'RE', reportType)
          .then((result) => ({ eye: 'RE' as Eye, result }))
      )
    }

    const completedResults = await Promise.all(tasks)
    const nextResults = completedResults.reduce(
      (acc, { eye, result }) => ({
        ...acc,
        [eye]: result?.status === 'complete' ? result : null,
      }),
      { LE: null, RE: null } as Record<Eye, ExtractionResult | null>
    )

    if (nextResults.LE || nextResults.RE) {
      setResults(nextResults)
      navigate('/result')
    }
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
          onFileSelected={handleLeftFileSelected}
          onClearFile={handleClearLeftFile}
          isUploading={leftEye.status === 'uploading'}
          selectedFile={leftSelectedFile}
        />
        <EyeUploadPanel
          abbreviation="RE"
          label="Right Eye"
          onFileSelected={handleRightFileSelected}
          onClearFile={handleClearRightFile}
          isUploading={rightEye.status === 'uploading'}
          selectedFile={rightSelectedFile}
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

    </div>
  )
}

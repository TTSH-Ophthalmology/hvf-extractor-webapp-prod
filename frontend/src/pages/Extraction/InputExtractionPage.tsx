/**
 * pages/InputExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiSearchEyeLine } from 'react-icons/ri'
import { FaEye } from 'react-icons/fa6'
import { EyeBox } from '../../components/extraction/EyeBox/EyeBox'
import { ExtractionProgressOverlay } from '../../components/extraction/ExtractionProgressOverlay/ExtractionProgressOverlay'
import type { EyeCode } from '../../components/extraction/types'
import { ReportTypeSelector, type ReportType } from '../../components/ui/Reports/ReportTypeSelector/ReportTypeSelector'
import { FileDropzone } from '../../components/ui/Upload/FileDropzone/FileDropzone'
import { FilePreview } from '../../components/ui/Upload/FilePreview/FilePreview'
import { usePDFUpload } from '../../hooks/usePDFUpload'
import { useExtraction } from '../../hooks/useExtraction'
import { useExtractionWorkflow } from '../../context/ExtractionWorkflowContext'
import type { ExtractionResult } from '../../models/extraction'
import './InputExtractionPage.css'

const reportTypeOptions = [
  { value: 'hvf',  label: 'HVF (Humphrey Visual Field)',        abbreviation: 'HVF'  },
  { value: 'vrvf', label: 'VRVF (Virtual Reality Visual Field)', abbreviation: 'VRVF' },
] satisfies Array<{ value: ReportType; label: string; abbreviation: string }>

type EyeUploadPanelProps = {
  abbreviation: EyeCode
  label: string
  onFilesSelected: (files: File[]) => void
  onClearFile: (fileIndex: number) => void
  isUploading: boolean
  selectedFiles: File[]
}

type ExtractionOverlayState = {
  variant: 'loading' | 'success' | 'warning' | 'error'
  title: string
  message: string
  progress?: number
  actionLabel?: string
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })

// better to add delay to overlay steps so that the user can see the progress, even if the upload/extraction is very fast
const DEBUG_OVERLAY_STEP_DELAY_MS = 100
const DEBUG_OVERLAY_SUCCESS_DELAY_MS = 1400

const EyeUploadPanel = ({
  abbreviation,
  label,
  onFilesSelected,
  onClearFile,
  isUploading,
  selectedFiles,
}: EyeUploadPanelProps) => {
  const selectedFileCount = selectedFiles.length

  return (
    <EyeBox
      abbreviation={abbreviation}
      label={label}
      hasSelectedFile={selectedFileCount > 0}
      headerAction={
        selectedFileCount > 0 ? (
          <div className="eye-file-count-status" aria-label={`${selectedFileCount} file${selectedFileCount === 1 ? '' : 's'} selected`}>
            <span>{selectedFileCount}</span>
            <FaEye className="eye-status-mark" aria-hidden="true" />
          </div>
        ) : undefined
      }
    >
      <FileDropzone
        inputId={`file-input-${abbreviation}`}
        isUploading={isUploading}
        onFilesSelected={onFilesSelected}
      />
      <FilePreview selectedFiles={selectedFiles} onClearFile={onClearFile} />
    </EyeBox>
  )
}

export const InputExtractionPage = () => {
  const navigate = useNavigate()
  const { reportType, setReportType, setResults, clearResults } = useExtractionWorkflow()
  const [leftSelectedFiles, setLeftSelectedFiles] = useState<File[]>([])
  const [rightSelectedFiles, setRightSelectedFiles] = useState<File[]>([])
  const [overlayState, setOverlayState] = useState<ExtractionOverlayState | null>(null)

  const leftEye  = usePDFUpload()
  const rightEye = usePDFUpload()

  const leftExtraction  = useExtraction()
  const rightExtraction = useExtraction()

  const leftSelectedFile = leftSelectedFiles[leftSelectedFiles.length - 1] ?? null
  const rightSelectedFile = rightSelectedFiles[rightSelectedFiles.length - 1] ?? null
  const hasSelectedFile = leftSelectedFiles.length > 0 || rightSelectedFiles.length > 0

  const isExtracting =
    leftExtraction.status  === 'extracting' ||
    rightExtraction.status === 'extracting'

  const isUploading =
    leftEye.status  === 'uploading' ||
    rightEye.status === 'uploading'

  const canExtract = hasSelectedFile && !isUploading && !isExtracting

  const handleLeftFilesSelected = useCallback((files: File[]) => {
    const latestFile = files[files.length - 1]
    setLeftSelectedFiles((currentFiles) => [...currentFiles, ...files])
    clearResults()
    leftExtraction.reset()
    leftEye.upload(latestFile)
  }, [clearResults, leftEye, leftExtraction])

  const handleRightFilesSelected = useCallback((files: File[]) => {
    const latestFile = files[files.length - 1]
    setRightSelectedFiles((currentFiles) => [...currentFiles, ...files])
    clearResults()
    rightExtraction.reset()
    rightEye.upload(latestFile)
  }, [clearResults, rightEye, rightExtraction])

  const handleClearLeftFile = useCallback((fileIndex: number) => {
    setLeftSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex))
    clearResults()
    leftEye.reset()
    leftExtraction.reset()
  }, [clearResults, leftEye, leftExtraction])

  const handleClearRightFile = useCallback((fileIndex: number) => {
    setRightSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex))
    clearResults()
    rightEye.reset()
    rightExtraction.reset()
  }, [clearResults, rightEye, rightExtraction])

  const handleExtract = async () => {
    setOverlayState({
      variant: 'loading',
      title: 'Preparing Extraction',
      message: 'Checking selected files before extraction starts.',
      progress: 12,
    })
    await delay(DEBUG_OVERLAY_STEP_DELAY_MS)

    const tasks: Promise<{ eye: EyeCode; result: ExtractionResult | null }>[] = []

    let leftJobId = leftEye.response?.job_id
    if (!leftJobId && leftSelectedFile) {
      setOverlayState({
        variant: 'loading',
        title: 'Uploading Left Eye',
        message: 'Uploading the left eye report for extraction.',
        progress: 28,
      })
      await delay(DEBUG_OVERLAY_STEP_DELAY_MS)
      const uploaded = await leftEye.upload(leftSelectedFile)
      leftJobId = uploaded?.job_id
    }

    let rightJobId = rightEye.response?.job_id
    if (!rightJobId && rightSelectedFile) {
      setOverlayState({
        variant: 'loading',
        title: 'Uploading Right Eye',
        message: 'Uploading the right eye report for extraction.',
        progress: leftJobId ? 42 : 28,
      })
      await delay(DEBUG_OVERLAY_STEP_DELAY_MS)
      const uploaded = await rightEye.upload(rightSelectedFile)
      rightJobId = uploaded?.job_id
    }

    if ((leftSelectedFile && !leftJobId) || (rightSelectedFile && !rightJobId)) {
      setOverlayState({
        variant: 'error',
        title: 'Upload Failed',
        message: leftEye.errorMessage ?? rightEye.errorMessage ?? 'One or more reports could not be uploaded.',
        actionLabel: 'Close',
      })
      return
    }

    if (leftJobId) {
      tasks.push(
        leftExtraction
          .extract(leftJobId, 'LE', reportType)
          .then((result) => ({ eye: 'LE' as EyeCode, result }))
      )
    }
    if (rightJobId) {
      tasks.push(
        rightExtraction
          .extract(rightJobId, 'RE', reportType)
          .then((result) => ({ eye: 'RE' as EyeCode, result }))
      )
    }

    if (tasks.length === 0) {
      setOverlayState({
        variant: 'warning',
        title: 'No Report Ready',
        message: 'Select at least one report and wait for upload to finish before running extraction.',
        actionLabel: 'Close',
      })
      return
    }

    setOverlayState({
      variant: 'loading',
      title: 'Extracting Report Data',
      message: 'Reading the uploaded report and preparing extracted fields.',
      progress: 72,
    })
    await delay(DEBUG_OVERLAY_STEP_DELAY_MS)

    const completedResults = await Promise.all(tasks)
    const nextResults = completedResults.reduce(
      (acc, { eye, result }) => ({
        ...acc,
        [eye]: result?.status === 'complete' ? result : null,
      }),
      { LE: null, RE: null } as Record<EyeCode, ExtractionResult | null>
    )

    if (nextResults.LE || nextResults.RE) {
      setOverlayState({
        variant: 'success',
        title: 'Extraction Complete',
        message: 'Extraction successful. Opening the results page...',
        progress: 100,
      })
      setResults(nextResults, reportType, {
        LE: leftSelectedFile,
        RE: rightSelectedFile,
      })
      await delay(DEBUG_OVERLAY_SUCCESS_DELAY_MS)
      navigate('/result')
      return
    }

    setOverlayState({
      variant: 'error',
      title: 'Extraction Failed',
      message: leftExtraction.errorMessage ?? rightExtraction.errorMessage ?? 'No completed extraction result was returned.',
      actionLabel: 'Close',
    })
  }

  const uploadError = leftEye.errorMessage ?? rightEye.errorMessage
  const extractionError = leftExtraction.errorMessage ?? rightExtraction.errorMessage

  return (
    <div className="extraction-page">
      <ReportTypeSelector
        options={reportTypeOptions}
        value={reportType}
        onChange={setReportType}
      />

      <div className="eye-upload-grid">
        <EyeUploadPanel
          abbreviation="LE"
          label="Left Eye"
          onFilesSelected={handleLeftFilesSelected}
          onClearFile={handleClearLeftFile}
          isUploading={leftEye.status === 'uploading'}
          selectedFiles={leftSelectedFiles}
        />
        <EyeUploadPanel
          abbreviation="RE"
          label="Right Eye"
          onFilesSelected={handleRightFilesSelected}
          onClearFile={handleClearRightFile}
          isUploading={rightEye.status === 'uploading'}
          selectedFiles={rightSelectedFiles}
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

      {overlayState && (
        <ExtractionProgressOverlay
          variant={overlayState.variant}
          title={overlayState.title}
          message={overlayState.message}
          progress={overlayState.progress}
          actionLabel={overlayState.actionLabel}
          onAction={() => setOverlayState(null)}
        />
      )}
    </div>
  )
}

/**
 * pages/InputExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { RiSearchEyeLine } from 'react-icons/ri'
import { FaEye } from 'react-icons/fa6'
import { EyeBox } from '../../components/extraction/EyeBox/EyeBox'
import { ExtractionProgressOverlay } from '../../components/extraction/ExtractionProgressOverlay/ExtractionProgressOverlay'
import type { EyeCode } from '../../components/extraction/types'
import { ReportTypeSelector, type ReportType } from '../../components/ui/Reports/ReportTypeSelector/ReportTypeSelector'
import { FileDropzone } from '../../components/ui/Upload/FileDropzone/FileDropzone'
import { FilePreview } from '../../components/ui/Upload/FilePreview/FilePreview'
import { useExtractionWorkflow } from '../../context/ExtractionWorkflowContext'
import { uploadFile } from '../../services/pdfService'
import { triggerExtraction } from '../../services/extractionService'
import type { ExtractionResultEntry, SkippedExtractionFile } from '../../context/ExtractionWorkflowContext'
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

type SelectedReport = {
  eye: EyeCode
  file: File
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })

// better to add delay to overlay steps so that the user can see the progress, even if the upload/extraction is very fast
const DEBUG_OVERLAY_STEP_DELAY_MS = 100
const DEBUG_OVERLAY_SUCCESS_DELAY_MS = 1400

const getErrorReason = (err: unknown) => {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const firstDetail = detail[0]

      if (typeof firstDetail?.msg === 'string') {
        return firstDetail.msg
      }
    }

    return err.message
  }

  return err instanceof Error ? err.message : 'Extraction failed.'
}

const createSkippedFile = (
  file: File,
  reason: string,
  index: number
): SkippedExtractionFile => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
  filename: file.name,
  size: file.size,
  reason,
})

const processSelectedReport = async (
  { eye, file }: SelectedReport,
  reportType: ReportType,
  index: number
) => {
  try {
    const upload = await uploadFile(file)
    const result = await triggerExtraction(upload.job_id, eye, reportType)

    if (result.status !== 'complete') {
      return {
        skippedFile: createSkippedFile(
          file,
          result.error_message || 'No completed extraction result was returned.',
          index
        ),
      }
    }

    return {
      resultEntry: {
        eye,
        originalFilename: file.name,
        result,
      } satisfies ExtractionResultEntry,
    }
  } catch (err) {
    return {
      skippedFile: createSkippedFile(file, getErrorReason(err), index),
    }
  }
}

const getExtractionCompleteMessage = (
  completedCount: number,
  skippedCount: number
) => {
  if (skippedCount === 0) {
    return 'Extraction successful. Opening the results page...'
  }

  if (completedCount === 0) {
    return 'No files were extracted. Opening the skipped files summary...'
  }

  return `${completedCount} file${completedCount === 1 ? '' : 's'} extracted and ${skippedCount} skipped. Opening the results page...`
}

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [overlayState, setOverlayState] = useState<ExtractionOverlayState | null>(null)

  const hasSelectedFile = leftSelectedFiles.length > 0 || rightSelectedFiles.length > 0

  const canExtract = hasSelectedFile && !isProcessing

  const handleLeftFilesSelected = useCallback((files: File[]) => {
    setLeftSelectedFiles((currentFiles) => [...currentFiles, ...files])
    clearResults()
  }, [clearResults])

  const handleRightFilesSelected = useCallback((files: File[]) => {
    setRightSelectedFiles((currentFiles) => [...currentFiles, ...files])
    clearResults()
  }, [clearResults])

  const handleClearLeftFile = useCallback((fileIndex: number) => {
    setLeftSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex))
    clearResults()
  }, [clearResults])

  const handleClearRightFile = useCallback((fileIndex: number) => {
    setRightSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex))
    clearResults()
  }, [clearResults])

  const handleExtract = async () => {
    const selectedReports = [
      ...leftSelectedFiles.map((file) => ({ eye: 'LE' as EyeCode, file })),
      ...rightSelectedFiles.map((file) => ({ eye: 'RE' as EyeCode, file })),
    ]

    if (selectedReports.length === 0) {
      setOverlayState({
        variant: 'warning',
        title: 'No Report Ready',
        message: 'Select at least one report before running extraction.',
        actionLabel: 'Close',
      })
      return
    }

    setIsProcessing(true)
    setOverlayState({
      variant: 'loading',
      title: 'Preparing Extraction',
      message: `Preparing ${selectedReports.length} report${selectedReports.length === 1 ? '' : 's'} for extraction.`,
      progress: 12,
    })
    await delay(DEBUG_OVERLAY_STEP_DELAY_MS)

    try {
      setOverlayState({
        variant: 'loading',
        title: 'Uploading Reports',
        message: 'Uploading all selected reports for extraction.',
        progress: 32,
      })
      await delay(DEBUG_OVERLAY_STEP_DELAY_MS)

      setOverlayState({
        variant: 'loading',
        title: 'Extracting Report Data',
        message: 'Reading every uploaded report and preparing extracted fields.',
        progress: 72,
      })
      await delay(DEBUG_OVERLAY_STEP_DELAY_MS)

      const processedReports = await Promise.all(
        selectedReports.map((selectedReport, index) =>
          processSelectedReport(selectedReport, reportType, index)
        )
      )

      const nextResults: ExtractionResultEntry[] = processedReports
        .map((processedReport) => processedReport.resultEntry)
        .filter((resultEntry): resultEntry is ExtractionResultEntry => Boolean(resultEntry))

      const skippedFiles: SkippedExtractionFile[] = processedReports
        .map((processedReport) => processedReport.skippedFile)
        .filter((skippedFile): skippedFile is SkippedExtractionFile => Boolean(skippedFile))

      if (nextResults.length > 0 || skippedFiles.length > 0) {
        setOverlayState({
          variant: nextResults.length > 0 ? 'success' : 'warning',
          title: nextResults.length > 0 ? 'Extraction Complete' : 'Extraction Finished',
          message: getExtractionCompleteMessage(nextResults.length, skippedFiles.length),
          progress: 100,
        })
        setResults(nextResults, reportType, selectedReports.length, skippedFiles)
        await delay(DEBUG_OVERLAY_SUCCESS_DELAY_MS)
        navigate('/result')
        return
      }

      setOverlayState({
        variant: 'error',
        title: 'Extraction Failed',
        message: 'No completed extraction result was returned.',
        actionLabel: 'Close',
      })
    } catch (err) {
      setOverlayState({
        variant: 'error',
        title: 'Extraction Failed',
        message: err instanceof Error ? err.message : 'One or more reports could not be extracted.',
        actionLabel: 'Close',
      })
    } finally {
      setIsProcessing(false)
    }
  }

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
          isUploading={isProcessing}
          selectedFiles={leftSelectedFiles}
        />
        <EyeUploadPanel
          abbreviation="RE"
          label="Right Eye"
          onFilesSelected={handleRightFilesSelected}
          onClearFile={handleClearRightFile}
          isUploading={isProcessing}
          selectedFiles={rightSelectedFiles}
        />
      </div>

      <div className="extraction-action-row">
        <button
          className="run-extraction-button"
          type="button"
          disabled={!canExtract}
          onClick={handleExtract}
          style={canExtract ? { background: '#00336a' } : undefined}
        >
          <RiSearchEyeLine size={18} />
          {isProcessing ? 'Extracting...' : 'Run Extraction'}
        </button>
      </div>

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

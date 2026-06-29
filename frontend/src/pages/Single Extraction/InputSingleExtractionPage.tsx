/**
 * pages/InputSingleExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiSearchEyeLine } from 'react-icons/ri'
import { EyeBox } from '../../components/single-extraction/EyeBox'
import { FileDropzone } from '../../components/single-extraction/FileDropzone'
import { FilePreview } from '../../components/single-extraction/FilePreview'
import type { EyeCode, SelectedFile } from '../../components/single-extraction/types'
import { ReportTypeSelector, type ReportType } from '../../components/ui/ReportTypeSelector'
import { usePDFUpload } from '../../hooks/usePDFUpload'
import { useExtraction } from '../../hooks/useExtraction'
import { useSingleExtractionWorkflow } from '../../context/SingleExtractionWorkflowContext'
import type { ExtractionResult } from '../../models/extraction'
import './InputSingleExtractionPage.css'

const reportTypeOptions = [
  { value: 'hvf',  label: 'HVF (Humphrey Visual Field)',        abbreviation: 'HVF'  },
  { value: 'vrvf', label: 'VRVF (Virtual Reality Visual Field)', abbreviation: 'VRVF' },
] satisfies Array<{ value: ReportType; label: string; abbreviation: string }>

type EyeUploadPanelProps = {
  abbreviation: EyeCode
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
  return (
    <EyeBox
      abbreviation={abbreviation}
      label={label}
      hasSelectedFile={Boolean(selectedFile)}
    >
      <FileDropzone
        inputId={`file-input-${abbreviation}`}
        isUploading={isUploading}
        onFileSelected={onFileSelected}
      />
      <FilePreview selectedFile={selectedFile} onClearFile={onClearFile} />
    </EyeBox>
  )
}

export const InputSingleExtractionPage = () => {
  const navigate = useNavigate()
  const { reportType, setReportType, setResults, clearResults } = useSingleExtractionWorkflow()
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
    const tasks: Promise<{ eye: EyeCode; result: ExtractionResult | null }>[] = []

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

    const completedResults = await Promise.all(tasks)
    const nextResults = completedResults.reduce(
      (acc, { eye, result }) => ({
        ...acc,
        [eye]: result?.status === 'complete' ? result : null,
      }),
      { LE: null, RE: null } as Record<EyeCode, ExtractionResult | null>
    )

    if (nextResults.LE || nextResults.RE) {
      setResults(nextResults, reportType)
      navigate('/result')
    }
  }

  const uploadError = leftEye.errorMessage ?? rightEye.errorMessage
  const extractionError = leftExtraction.errorMessage ?? rightExtraction.errorMessage

  return (
    <div className="single-extraction-page">
      <ReportTypeSelector
        options={reportTypeOptions}
        value={reportType}
        onChange={setReportType}
      />

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

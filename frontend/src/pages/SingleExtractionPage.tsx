/**
 * pages/SingleExtractionPage.tsx — Upload HVF PDFs and run extraction.
 *
 * VIEW: renders the report type selector and dual-eye upload panels.
 * State is managed by usePDFUpload (upload lifecycle) and useExtraction
 * (extraction lifecycle) hooks — one instance per eye.
 */

import { CloudUpload, FileText, Search } from 'lucide-react'
import { useState } from 'react'
import { ReportTypeSelector, type ReportType } from '../components/ui/ReportTypeSelector'
import { usePDFUpload } from '../hooks/usePDFUpload'
import { useExtraction } from '../hooks/useExtraction'
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
  isUploading: boolean
  selectedFilename: string | null
}

const EyeUploadPanel = ({
  abbreviation,
  label,
  onFileSelected,
  isUploading,
  selectedFilename,
}: EyeUploadPanelProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <section className="eye-upload-panel" aria-labelledby={`${abbreviation}-title`}>
      <header className="eye-upload-header">
        <div className="eye-upload-title" id={`${abbreviation}-title`}>
          <span className="eye-code">{abbreviation}</span>
          <span>{label}</span>
        </div>
        <span className="eye-status-mark" aria-hidden="true">~</span>
      </header>

      <label className="file-dropzone" htmlFor={`file-input-${abbreviation}`}>
        <div className="upload-icon-box">
          <CloudUpload size={24} strokeWidth={2.2} />
        </div>
        <p>Drag and drop file here</p>
        <span>Supported: PDF (Max 200 MB)</span>
        <input
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

      <div className="selected-file-row">
        <FileText size={20} strokeWidth={2} />
        <strong>{selectedFilename ?? 'No file selected'}</strong>
      </div>
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
          isUploading={leftEye.status === 'uploading'}
          selectedFilename={leftEye.response?.filename ?? null}
        />
        <EyeUploadPanel
          abbreviation="RE"
          label="Right Eye"
          onFileSelected={rightEye.upload}
          isUploading={rightEye.status === 'uploading'}
          selectedFilename={rightEye.response?.filename ?? null}
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
          <Search size={16} strokeWidth={2.2} />
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

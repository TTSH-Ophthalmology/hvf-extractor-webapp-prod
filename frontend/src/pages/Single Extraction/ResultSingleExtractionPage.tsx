/**
 * pages/ResultSingleExtractionPage.tsx — Displays completed single-extraction results.
 */

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { LuClipboardList } from 'react-icons/lu'
import { ResultExtractionDataPreview } from '../../components/single-extraction/ResultExtractionDataPreview'
import type { PreviewMode } from '../../components/single-extraction/ResultExtractionDataPreview'
import { ResultEyePreviewBox } from '../../components/single-extraction/ResultEyePreviewBox'
import { DownloadDataButton } from '../../components/single-extraction/DownloadDataButton'
import { ReportTypePreview } from '../../components/ui/ReportTypePreview'
import type { ReportType } from '../../components/ui/ReportTypeSelector'
import { useSingleExtractionWorkflow } from '../../context/SingleExtractionWorkflowContext'
import type { ExtractionResultsByEye } from '../../context/SingleExtractionWorkflowContext'
import './ResultSingleExtractionPage.css'

type Eye = keyof ExtractionResultsByEye

type ResultRow = {
  eye: Eye
  label: string
  rawData: Record<string, string>
}

const eyeLabels: Record<Eye, string> = {
  LE: 'Left Eye',
  RE: 'Right Eye',
}

const reportTypeOptions = [
  { value: 'hvf',  label: 'HVF (Humphrey Visual Field)',        abbreviation: 'HVF'  },
  { value: 'vrvf', label: 'VRVF (Virtual Reality Visual Field)', abbreviation: 'VRVF' },
] satisfies Array<{ value: ReportType; label: string; abbreviation: string }>

const escapeCsvValue = (value: string) => {
  if (!/[",\n\r]/.test(value)) return value

  return `"${value.replace(/"/g, '""')}"`
}

const formatCompletedAt = (completedAt: Date | null) => {
  if (!completedAt) return null

  return completedAt.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const ResultSingleExtractionPage = () => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('csv')
  const { results, uploadedFiles, reportType, completedAt, hasResults } = useSingleExtractionWorkflow()

  if (!hasResults) {
    return <Navigate to="/" replace />
  }

  const resultRows: ResultRow[] = ([
    { eye: 'LE' as Eye, result: results.LE },
    { eye: 'RE' as Eye, result: results.RE },
  ])
    .filter(({ result }) => Boolean(result))
    .map(({ eye, result }) => ({
      eye,
      label: eyeLabels[eye],
      rawData: result?.raw_data ?? {},
    }))

  const fieldNames = Array.from(
    new Set(resultRows.flatMap((row) => Object.keys(row.rawData)))
  )

  const completedEyesText = resultRows.map((row) => row.eye).join(' and ')
  const completedAtText = formatCompletedAt(completedAt)

  return (
    <div className="result-single-extraction-page">
      <header className="result-page-header">
        <div className="result-title-block">
          <h1>Extraction Results</h1>
          <div className="result-status-row">
            <span className="result-status-pill">
              <CheckCircle size={13} strokeWidth={3} />
              {completedAtText
                ? `Extraction completed at ${completedAtText}`
                : 'Extraction completed'}
            </span>
            <span>{completedEyesText} eye(s) processed</span>
          </div>
        </div>
        <ReportTypePreview
          options={reportTypeOptions}
          value={reportType}
        />
      </header>

      <section className="result-data-panel" aria-label="Preview extraction data">
        <header>
          <div className="result-data-heading">
            <div className="result-data-title">
              <LuClipboardList size={21} aria-hidden="true" />
              <h2>Preview Extraction Data</h2>
            </div>
            <div className="result-preview-toggle" aria-label="Preview format">
              <button
                className={previewMode === 'csv' ? 'result-preview-toggle-active' : undefined}
                type="button"
                aria-pressed={previewMode === 'csv'}
                onClick={() => setPreviewMode('csv')}
              >
                CSV
              </button>
              <button
                className={previewMode === 'json' ? 'result-preview-toggle-active' : undefined}
                type="button"
                aria-pressed={previewMode === 'json'}
                onClick={() => setPreviewMode('json')}
              >
                JSON
              </button>
            </div>
          </div>
          <DownloadDataButton
            rows={resultRows}
            fieldNames={fieldNames}
            filenamePrefix="single-extraction-results"
          />
        </header>

        <ResultEyePreviewBox rows={resultRows} uploadedFiles={uploadedFiles}>
          <ResultExtractionDataPreview
            mode={previewMode}
            rows={resultRows}
            fieldNames={fieldNames}
          />
        </ResultEyePreviewBox>
      </section>
    </div>
  )
}

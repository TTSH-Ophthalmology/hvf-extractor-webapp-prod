/**
 * pages/ResultExtractionPage.tsx — Displays completed extraction results.
 */

import { Navigate } from 'react-router-dom'
import { FaCheckCircle } from 'react-icons/fa'
import { LuClipboardList } from 'react-icons/lu'
import { DownloadDataButton } from '../../components/extraction/DownloadDataButton/DownloadDataButton'
import { ResultExtractionDataPreview } from '../../components/extraction/ResultExtractionDataPreview/ResultExtractionDataPreview'
import { ReportTypePreview } from '../../components/ui/Reports/ReportTypePreview/ReportTypePreview'
import type { ReportType } from '../../components/ui/Reports/ReportTypeSelector/ReportTypeSelector'
import { useExtractionWorkflow } from '../../context/ExtractionWorkflowContext'
import './ResultExtractionPage.css'

type Eye = 'LE' | 'RE'

type ResultRow = {
  id: string
  eye: Eye
  label: string
  filename: string
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

const formatCompletedAt = (completedAt: Date | null) => {
  if (!completedAt) return null

  return completedAt.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const ResultExtractionPage = () => {
  const { results, extractionTotal, reportType, completedAt, hasResults } = useExtractionWorkflow()

  const resultRows: ResultRow[] = results.map(({ eye, originalFilename, result }, index) => ({
      id: `${result.job_id}-${index}`,
      eye,
      label: eyeLabels[eye],
      filename: originalFilename,
      rawData: result.raw_data,
    }))

  const fieldNames = Array.from(
    new Set(resultRows.flatMap((row) => Object.keys(row.rawData)))
  )

  const extractionAttemptTotal = extractionTotal || resultRows.length
  const extractionSummaryText = `${resultRows.length} of ${extractionAttemptTotal} file${extractionAttemptTotal === 1 ? '' : 's'} extracted`
  const completedAtText = formatCompletedAt(completedAt)

  if (!hasResults) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="result-extraction-page">
      <header className="result-page-header">
        <div className="result-title-block">
          <h1>Extraction Results</h1>
          <div className="result-status-row">
            <span className="result-status-pill">
              <FaCheckCircle size={13} aria-hidden="true" />
              {completedAtText
                ? `Completed at ${completedAtText}`
                : 'Completed'}
            </span>
            <span className="result-eye-count">{extractionSummaryText}</span>
          </div>
        </div>
        <ReportTypePreview
          options={reportTypeOptions}
          value={reportType}
        />
      </header>

      <section
        className="result-data-panel"
        aria-label="Preview extraction data"
      >
        <header>
          <div className="result-data-heading">
            <div className="result-data-title">
              <LuClipboardList size={21} aria-hidden="true" />
              <h2>Preview Extraction Data</h2>
            </div>
          </div>
          <DownloadDataButton
            rows={resultRows}
            fieldNames={fieldNames}
            filenamePrefix="extraction-results"
          />
        </header>

        <ResultExtractionDataPreview
          rows={resultRows}
          fieldNames={fieldNames}
        />
      </section>
    </div>
  )
}

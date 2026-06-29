/**
 * pages/ResultSingleExtractionPage.tsx — Displays completed single-extraction results.
 */

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle, ChevronDown, Download, Table2 } from 'lucide-react'
import { FaRegFilePdf } from 'react-icons/fa6'
import { ReportTypePreview } from '../../components/ui/ReportTypePreview'
import type { ReportType } from '../../components/ui/ReportTypeSelector'
import { useSingleExtractionWorkflow } from '../../context/SingleExtractionWorkflowContext'
import type { ExtractionResultsByEye } from '../../context/SingleExtractionWorkflowContext'
import './ResultSingleExtractionPage.css'

type Eye = keyof ExtractionResultsByEye
type PreviewMode = 'csv' | 'json'

type ResultRow = {
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

const formatFieldName = (fieldName: string) =>
  fieldName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()

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
  const { results, reportType, completedAt, hasResults } = useSingleExtractionWorkflow()

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
      filename: result?.filename ?? 'Uploaded report',
      rawData: result?.raw_data ?? {},
    }))

  const fieldNames = Array.from(
    new Set(resultRows.flatMap((row) => Object.keys(row.rawData)))
  )

  const completedEyesText = resultRows.map((row) => row.eye).join(' and ')
  const completedAtText = formatCompletedAt(completedAt)
  const jsonPreview = resultRows.reduce(
    (acc, row) => ({
      ...acc,
      [row.eye]: row.rawData,
    }),
    {} as Record<Eye, Record<string, string>>
  )

  const handleDownload = () => {
    const headers = ['EYE', ...fieldNames]
    const csvRows = [
      headers.map(escapeCsvValue).join(','),
      ...resultRows.map((row) =>
        [row.eye, ...fieldNames.map((fieldName) => row.rawData[fieldName] ?? '')]
          .map(escapeCsvValue)
          .join(',')
      ),
    ]

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'single-extraction-results.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

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

      <section className="result-eye-grid" aria-label="Processed eye reports">
        {resultRows.map((row) => (
          <article className="result-eye-card" key={row.eye}>
            <header>
              <div>
                <strong>{row.eye}</strong>
                <span>{row.label}</span>
              </div>
              <span className="result-eye-indicator" aria-hidden="true" />
            </header>

            <div className="result-file-card">
              <span className="result-file-icon" aria-hidden="true">
                <FaRegFilePdf size={15} />
              </span>
              <div>
                <strong>{row.filename}</strong>
                <span>Uploaded report</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="result-data-panel" aria-label="Preview extraction data">
        <header>
          <div className="result-data-heading">
            <div className="result-data-title">
              <Table2 size={17} strokeWidth={2.2} />
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
          <button className="result-download-button" type="button" onClick={handleDownload}>
            <Download size={14} strokeWidth={2.4} />
            <span>Download</span>
            <ChevronDown size={14} strokeWidth={2.4} />
          </button>
        </header>

        {previewMode === 'csv' ? (
          <div className="result-table-wrap">
            <table className="result-data-table">
              <thead>
                <tr>
                  <th>Eye</th>
                  {fieldNames.map((fieldName) => (
                    <th key={fieldName}>{formatFieldName(fieldName)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row) => (
                  <tr key={row.eye}>
                    <th scope="row">{row.eye}</th>
                    {fieldNames.map((fieldName) => (
                      <td key={fieldName}>{row.rawData[fieldName] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="result-json-preview">
            {JSON.stringify(jsonPreview, null, 2)}
          </pre>
        )}
      </section>
    </div>
  )
}

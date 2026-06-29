/**
 * pages/ResultSingleExtractionPage.tsx — Displays completed single-extraction results.
 */

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle, ChevronsUpDown } from 'lucide-react'
import { LuClipboardList } from 'react-icons/lu'
import { ResultExtractionDataPreview } from '../../components/single-extraction/ResultExtractionDataPreview'
import type { PreviewMode } from '../../components/single-extraction/ResultExtractionDataPreview'
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

type PreviewPanelSize = {
  height: number
  min: number
  max: number
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const ResultSingleExtractionPage = () => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('csv')
  const [previewPanelSizes, setPreviewPanelSizes] = useState<
    Partial<Record<PreviewMode, PreviewPanelSize>>
  >({})
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const { results, uploadedFiles, reportType, completedAt, hasResults } = useSingleExtractionWorkflow()

  const getPreviewPanelMaxHeight = useCallback((panel: HTMLElement) => {
    const header = panel.querySelector(':scope > header')
    const footer = panel.querySelector('.result-panel-resize-footer')
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0
    const footerHeight = footer instanceof HTMLElement ? footer.offsetHeight : 0

    if (previewMode === 'json') {
      const grid = panel.querySelector('.result-json-eye-grid')
      const eyePanels = Array.from(panel.querySelectorAll('.result-json-eye-grid .eye-upload-panel'))

      if (!(grid instanceof HTMLElement) || eyePanels.length === 0) {
        return panel.scrollHeight
      }

      const gridStyles = window.getComputedStyle(grid)
      const gridVerticalMargin =
        Number.parseFloat(gridStyles.marginTop) +
        Number.parseFloat(gridStyles.marginBottom)

      const desiredEyeHeights = eyePanels.map((eyePanel) => {
        if (!(eyePanel instanceof HTMLElement)) return 0

        const eyeHeader = eyePanel.querySelector('.eye-upload-header')
        const eyeContent = eyePanel.querySelector('.result-preview-eye-content')
        const eyeContentChild = eyeContent?.firstElementChild
        const eyeHeaderHeight = eyeHeader instanceof HTMLElement ? eyeHeader.offsetHeight : 0
        const eyeContentStyles = eyeContent instanceof HTMLElement
          ? window.getComputedStyle(eyeContent)
          : null
        const eyeContentVerticalPadding = eyeContentStyles
          ? Number.parseFloat(eyeContentStyles.paddingTop) +
            Number.parseFloat(eyeContentStyles.paddingBottom)
          : 0
        const eyeContentBodyHeight = eyeContentChild instanceof HTMLElement
          ? Math.max(eyeContentChild.scrollHeight, eyeContentChild.offsetHeight)
          : eyeContent instanceof HTMLElement
            ? eyeContent.scrollHeight
            : 0

        return eyeHeaderHeight + eyeContentVerticalPadding + eyeContentBodyHeight
      })

      const gridStylesColumnCount = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length
      const gridRowGap = Number.parseFloat(gridStyles.rowGap) || 0
      const gridContentHeight = gridStylesColumnCount <= 1
        ? desiredEyeHeights.reduce((total, height) => total + height, 0) +
          Math.max(desiredEyeHeights.length - 1, 0) * gridRowGap
        : Math.max(...desiredEyeHeights)

      return headerHeight + gridVerticalMargin + gridContentHeight + footerHeight + 2
    }

    return panel.scrollHeight
  }, [previewMode])

  const handlePreviewResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const panel = previewPanelRef.current
    const currentSize = previewPanelSizes[previewMode]
    if (previewMode !== 'json' || !panel || !currentSize) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const startY = event.clientY
    const startHeight = currentSize.height
    const maxHeight = Math.ceil(Math.max(currentSize.max, getPreviewPanelMaxHeight(panel)))
    let lastAppliedHeight = startHeight

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = clamp(
        startHeight + moveEvent.clientY - startY,
        currentSize.min,
        maxHeight
      )
      const appliedDelta = nextHeight - lastAppliedHeight

      setPreviewPanelSizes((currentSizes) => ({
        ...currentSizes,
        [previewMode]: {
          height: nextHeight,
          min: currentSize.min,
          max: maxHeight,
        },
      }))

      if (appliedDelta !== 0) {
        window.scrollBy({
          top: appliedDelta,
          behavior: 'auto',
        })
        lastAppliedHeight = nextHeight
      }
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
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
  const previewMeasurementKey = resultRows
    .map((row) => `${row.eye}:${JSON.stringify(row.rawData).length}`)
    .join('|')

  useLayoutEffect(() => {
    const panel = previewPanelRef.current
    if (!panel || previewMode !== 'json') return

    const measuredHeight = Math.ceil(panel.getBoundingClientRect().height)
    const maxHeight = Math.ceil(Math.max(measuredHeight, getPreviewPanelMaxHeight(panel)))

    setPreviewPanelSizes((currentSizes) => {
      const currentSize = currentSizes[previewMode]
      const minHeight = currentSize?.min ?? measuredHeight
      const nextHeight = clamp(currentSize?.height ?? measuredHeight, minHeight, maxHeight)

      return {
        ...currentSizes,
        [previewMode]: {
          height: nextHeight,
          min: minHeight,
          max: maxHeight,
        },
      }
    })
  }, [fieldNames.length, getPreviewPanelMaxHeight, previewMeasurementKey, previewMode, resultRows.length])

  if (!hasResults) {
    return <Navigate to="/" replace />
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

      <section
        ref={previewPanelRef}
        className={`result-data-panel${previewMode === 'json' ? ' result-data-panel-resizable result-data-panel-json' : ''}`}
        aria-label="Preview extraction data"
        style={
          previewMode === 'json' && previewPanelSizes.json
            ? { height: `${previewPanelSizes[previewMode]?.height}px` }
            : undefined
        }
      >
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

        <ResultExtractionDataPreview
          mode={previewMode}
          rows={resultRows}
          fieldNames={fieldNames}
          uploadedFiles={uploadedFiles}
        />
        {previewMode === 'json' && (
          <footer className="result-panel-resize-footer">
            <button
              className="result-panel-resize-handle"
              type="button"
              aria-label="Resize preview panel vertically"
              onPointerDown={handlePreviewResizePointerDown}
            >
              <ChevronsUpDown size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}

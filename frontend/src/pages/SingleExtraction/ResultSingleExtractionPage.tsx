/**
 * pages/ResultSingleExtractionPage.tsx — Displays completed single-extraction results.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react'
import { FaCheckCircle } from 'react-icons/fa'
import { LuClipboardList } from 'react-icons/lu'
import { DownloadDataButton } from '../../components/extraction/DownloadDataButton/DownloadDataButton'
import { ResultExtractionDataPreview } from '../../components/extraction/ResultExtractionDataPreview/ResultExtractionDataPreview'
import type { PreviewMode } from '../../components/extraction/ResultExtractionDataPreview/ResultExtractionDataPreview'
import { ReportTypePreview } from '../../components/ui/Reports/ReportTypePreview/ReportTypePreview'
import type { ReportType } from '../../components/ui/Reports/ReportTypeSelector/ReportTypeSelector'
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

const PANEL_RESIZE_STEP = 32
const PANEL_RESIZE_REPEAT_MS = 85

export const ResultSingleExtractionPage = () => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('csv')
  const [previewPanelSizes, setPreviewPanelSizes] = useState<
    Partial<Record<PreviewMode, PreviewPanelSize>>
  >({})
  const previewPanelSizesRef = useRef<Partial<Record<PreviewMode, PreviewPanelSize>>>({})
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const resizeRepeatRef = useRef<number | null>(null)
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

      return headerHeight + gridVerticalMargin + gridContentHeight + footerHeight
    }

    return panel.scrollHeight
  }, [previewMode])

  const stopPreviewResizeRepeat = useCallback(() => {
    if (resizeRepeatRef.current !== null) {
      window.clearInterval(resizeRepeatRef.current)
      resizeRepeatRef.current = null
    }
  }, [])

  const scrollPreviewPanelDelta = useCallback((delta: number) => {
    const panel = previewPanelRef.current
    if (!panel) return

    const scrollContainer = panel.closest('.page-content')

    if (delta > 0) {
      const scrollToBottom = () => {
        if (scrollContainer instanceof HTMLElement) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
          return
        }

        const scrollingElement = document.scrollingElement ?? document.documentElement
        window.scrollTo({
          top: scrollingElement.scrollHeight,
          behavior: 'auto',
        })
      }

      scrollToBottom()
      window.requestAnimationFrame(scrollToBottom)
    } else if (delta < 0) {
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.scrollTop += delta
      } else {
        window.scrollBy({
          top: delta,
          behavior: 'auto',
        })
      }
    }
  }, [])

  const resizePreviewPanel = useCallback((direction: 'up' | 'down') => {
    const panel = previewPanelRef.current
    if (previewMode !== 'json' || !panel) return

    const currentSize = previewPanelSizesRef.current[previewMode]
    if (!currentSize) return

    const maxHeight = Math.ceil(Math.max(currentSize.min, getPreviewPanelMaxHeight(panel)))
    const nextHeight = clamp(
      currentSize.height + (direction === 'down' ? PANEL_RESIZE_STEP : -PANEL_RESIZE_STEP),
      currentSize.min,
      maxHeight
    )
    const appliedDelta = nextHeight - currentSize.height

    if (appliedDelta === 0) return

    panel.style.height = `${nextHeight}px`
    scrollPreviewPanelDelta(appliedDelta)

    const nextSizes = {
      ...previewPanelSizesRef.current,
      [previewMode]: {
        height: nextHeight,
        min: currentSize.min,
        max: maxHeight,
      },
    }

    previewPanelSizesRef.current = nextSizes
    setPreviewPanelSizes((currentSizes) => ({
      ...currentSizes,
      [previewMode]: {
        height: nextHeight,
        min: currentSize.min,
        max: maxHeight,
      },
    }))
  }, [getPreviewPanelMaxHeight, previewMode, scrollPreviewPanelDelta])

  const setPreviewPanelHeight = useCallback((heightTarget: 'min' | 'max') => {
    const panel = previewPanelRef.current
    if (previewMode !== 'json' || !panel) return

    const currentSize = previewPanelSizesRef.current[previewMode]
    if (!currentSize) return

    const maxHeight = Math.ceil(Math.max(currentSize.min, getPreviewPanelMaxHeight(panel)))
    const nextHeight = heightTarget === 'max' ? maxHeight : currentSize.min
    const appliedDelta = nextHeight - currentSize.height

    if (appliedDelta === 0) return

    panel.style.height = `${nextHeight}px`
    scrollPreviewPanelDelta(appliedDelta)

    const nextSizes = {
      ...previewPanelSizesRef.current,
      [previewMode]: {
        height: nextHeight,
        min: currentSize.min,
        max: maxHeight,
      },
    }

    previewPanelSizesRef.current = nextSizes
    setPreviewPanelSizes((currentSizes) => ({
      ...currentSizes,
      [previewMode]: {
        height: nextHeight,
        min: currentSize.min,
        max: maxHeight,
      },
    }))
  }, [getPreviewPanelMaxHeight, previewMode, scrollPreviewPanelDelta])

  const handlePreviewResizePointerDown = (
    direction: 'up' | 'down',
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (previewMode !== 'json') return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    stopPreviewResizeRepeat()
    resizePreviewPanel(direction)

    resizeRepeatRef.current = window.setInterval(() => {
      resizePreviewPanel(direction)
    }, PANEL_RESIZE_REPEAT_MS)

    const handlePointerEnd = () => {
      stopPreviewResizeRepeat()
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }

    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
  }

  const handlePreviewResizeKeyDown = (
    direction: 'up' | 'down',
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    resizePreviewPanel(direction)
  }

  useEffect(() => {
    return () => {
      stopPreviewResizeRepeat()
    }
  }, [stopPreviewResizeRepeat])

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
  const currentPreviewPanelSize = previewPanelSizes[previewMode]
  const canShrinkPreviewPanel = previewMode === 'json' && currentPreviewPanelSize
    ? currentPreviewPanelSize.height > currentPreviewPanelSize.min
    : false
  const canGrowPreviewPanel = previewMode === 'json' && currentPreviewPanelSize
    ? currentPreviewPanelSize.height < currentPreviewPanelSize.max
    : false
  const isPreviewPanelAtMax = previewMode === 'json' && currentPreviewPanelSize
    ? currentPreviewPanelSize.height >= currentPreviewPanelSize.max
    : false

  useLayoutEffect(() => {
    const panel = previewPanelRef.current
    if (!panel || previewMode !== 'json') return

    const measuredHeight = Math.ceil(panel.getBoundingClientRect().height)

    setPreviewPanelSizes((currentSizes) => {
      const currentSize = currentSizes[previewMode]
      const minHeight = currentSize?.min ?? measuredHeight
      const maxHeight = Math.ceil(Math.max(minHeight, getPreviewPanelMaxHeight(panel)))
      const nextHeight = clamp(currentSize?.height ?? measuredHeight, minHeight, maxHeight)

      const nextSizes = {
        ...currentSizes,
        [previewMode]: {
          height: nextHeight,
          min: minHeight,
          max: maxHeight,
        },
      }

      previewPanelSizesRef.current = nextSizes
      return nextSizes
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
              <FaCheckCircle size={13} aria-hidden="true" />
              {completedAtText
                ? `Completed at ${completedAtText}`
                : 'Completed'}
            </span>
            <span className="result-eye-count">{completedEyesText} eye(s) processed</span>
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
              className="result-panel-resize-button"
              type="button"
              aria-label="Decrease preview panel height"
              disabled={!canShrinkPreviewPanel}
              onPointerDown={(event) => handlePreviewResizePointerDown('up', event)}
              onKeyDown={(event) => handlePreviewResizeKeyDown('up', event)}
            >
              <ChevronUp size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <button
              className="result-panel-resize-button"
              type="button"
              aria-label="Increase preview panel height"
              disabled={!canGrowPreviewPanel}
              onPointerDown={(event) => handlePreviewResizePointerDown('down', event)}
              onKeyDown={(event) => handlePreviewResizeKeyDown('down', event)}
            >
              <ChevronDown size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
                        <button
              className="result-panel-resize-button result-panel-resize-jump-button"
              type="button"
              aria-label={isPreviewPanelAtMax
                ? 'Collapse preview panel to minimum height'
                : 'Expand preview panel to maximum height'}
              disabled={!currentPreviewPanelSize}
              onClick={() => setPreviewPanelHeight(isPreviewPanelAtMax ? 'min' : 'max')}
            >
              {isPreviewPanelAtMax ? (
                <Minimize2 size={13} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Maximize2 size={13} strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}

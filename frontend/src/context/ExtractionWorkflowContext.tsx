import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'

export type ExtractionResultEntry = {
  eye: 'LE' | 'RE'
  originalFilename: string
  result: ExtractionResult
}

export type SkippedExtractionFile = {
  id: string
  filename: string
  size: number
  reason: string
}

export type ExtractionReportType = 'hvf' | 'vrvf'

type ExtractionWorkflowContextValue = {
  results: ExtractionResultEntry[]
  skippedFiles: SkippedExtractionFile[]
  extractionTotal: number
  reportType: ExtractionReportType
  completedAt: Date | null
  hasResults: boolean
  setReportType: (reportType: ExtractionReportType) => void
  setResults: (
    results: ExtractionResultEntry[],
    reportType?: ExtractionReportType,
    extractionTotal?: number,
    skippedFiles?: SkippedExtractionFile[]
  ) => void
  clearResults: () => void
}

const emptyResults: ExtractionResultEntry[] = []
const emptySkippedFiles: SkippedExtractionFile[] = []

const ExtractionWorkflowContext =
  createContext<ExtractionWorkflowContextValue | null>(null)

type ExtractionWorkflowProviderProps = {
  children: ReactNode
}

export const ExtractionWorkflowProvider = ({
  children,
}: ExtractionWorkflowProviderProps) => {
  const [results, setResultsState] = useState<ExtractionResultEntry[]>(emptyResults)
  const [skippedFiles, setSkippedFiles] = useState<SkippedExtractionFile[]>(emptySkippedFiles)
  const [extractionTotal, setExtractionTotal] = useState(0)
  const [reportType, setReportType] = useState<ExtractionReportType>('hvf')
  const [completedAt, setCompletedAt] = useState<Date | null>(null)

  const setResults = useCallback((
    nextResults: ExtractionResultEntry[],
    nextReportType?: ExtractionReportType,
    nextExtractionTotal = nextResults.length,
    nextSkippedFiles: SkippedExtractionFile[] = emptySkippedFiles
  ) => {
    setResultsState(nextResults)
    setSkippedFiles(nextSkippedFiles)
    setExtractionTotal(nextExtractionTotal)
    setCompletedAt(new Date())
    if (nextReportType) {
      setReportType(nextReportType)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResultsState(emptyResults)
    setSkippedFiles(emptySkippedFiles)
    setExtractionTotal(0)
    setCompletedAt(null)
  }, [])

  const value = useMemo(
    () => ({
      results,
      skippedFiles,
      extractionTotal,
      reportType,
      completedAt,
      hasResults: results.length > 0 || skippedFiles.length > 0,
      setReportType,
      setResults,
      clearResults,
    }),
    [clearResults, completedAt, extractionTotal, reportType, results, setResults, skippedFiles]
  )

  return (
    <ExtractionWorkflowContext.Provider value={value}>
      {children}
    </ExtractionWorkflowContext.Provider>
  )
}

export const useExtractionWorkflow = () => {
  const value = useContext(ExtractionWorkflowContext)

  if (!value) {
    throw new Error('useExtractionWorkflow must be used within ExtractionWorkflowProvider')
  }

  return value
}

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'

export type ExtractionResultEntry = {
  eye: 'LE' | 'RE'
  originalFilename: string
  result: ExtractionResult
}

export type ExtractionReportType = 'hvf' | 'vrvf'

type ExtractionWorkflowContextValue = {
  results: ExtractionResultEntry[]
  reportType: ExtractionReportType
  completedAt: Date | null
  hasResults: boolean
  setReportType: (reportType: ExtractionReportType) => void
  setResults: (
    results: ExtractionResultEntry[],
    reportType?: ExtractionReportType
  ) => void
  clearResults: () => void
}

const emptyResults: ExtractionResultEntry[] = []

const ExtractionWorkflowContext =
  createContext<ExtractionWorkflowContextValue | null>(null)

type ExtractionWorkflowProviderProps = {
  children: ReactNode
}

export const ExtractionWorkflowProvider = ({
  children,
}: ExtractionWorkflowProviderProps) => {
  const [results, setResultsState] = useState<ExtractionResultEntry[]>(emptyResults)
  const [reportType, setReportType] = useState<ExtractionReportType>('hvf')
  const [completedAt, setCompletedAt] = useState<Date | null>(null)

  const setResults = useCallback((
    nextResults: ExtractionResultEntry[],
    nextReportType?: ExtractionReportType
  ) => {
    setResultsState(nextResults)
    setCompletedAt(new Date())
    if (nextReportType) {
      setReportType(nextReportType)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResultsState(emptyResults)
    setCompletedAt(null)
  }, [])

  const value = useMemo(
    () => ({
      results,
      reportType,
      completedAt,
      hasResults: results.length > 0,
      setReportType,
      setResults,
      clearResults,
    }),
    [clearResults, completedAt, reportType, results, setResults]
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

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'

export type ExtractionResultsByEye = {
  LE: ExtractionResult | null
  RE: ExtractionResult | null
}

export type ExtractionReportType = 'hvf' | 'vrvf'

type SingleExtractionWorkflowContextValue = {
  results: ExtractionResultsByEye
  reportType: ExtractionReportType
  hasResults: boolean
  setResults: (results: ExtractionResultsByEye, reportType?: ExtractionReportType) => void
  clearResults: () => void
}

const emptyResults: ExtractionResultsByEye = {
  LE: null,
  RE: null,
}

const SingleExtractionWorkflowContext =
  createContext<SingleExtractionWorkflowContextValue | null>(null)

type SingleExtractionWorkflowProviderProps = {
  children: ReactNode
}

export const SingleExtractionWorkflowProvider = ({
  children,
}: SingleExtractionWorkflowProviderProps) => {
  const [results, setResultsState] = useState<ExtractionResultsByEye>(emptyResults)
  const [reportType, setReportType] = useState<ExtractionReportType>('hvf')

  const setResults = useCallback((
    nextResults: ExtractionResultsByEye,
    nextReportType?: ExtractionReportType
  ) => {
    setResultsState(nextResults)
    if (nextReportType) {
      setReportType(nextReportType)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResultsState(emptyResults)
  }, [])

  const value = useMemo(
    () => ({
      results,
      reportType,
      hasResults: Boolean(results.LE || results.RE),
      setResults,
      clearResults,
    }),
    [clearResults, reportType, results, setResults]
  )

  return (
    <SingleExtractionWorkflowContext.Provider value={value}>
      {children}
    </SingleExtractionWorkflowContext.Provider>
  )
}

export const useSingleExtractionWorkflow = () => {
  const value = useContext(SingleExtractionWorkflowContext)

  if (!value) {
    throw new Error('useSingleExtractionWorkflow must be used within SingleExtractionWorkflowProvider')
  }

  return value
}

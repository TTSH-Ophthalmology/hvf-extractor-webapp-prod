import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'

export type ExtractionResultsByEye = {
  LE: ExtractionResult | null
  RE: ExtractionResult | null
}

type SingleExtractionWorkflowContextValue = {
  results: ExtractionResultsByEye
  hasResults: boolean
  setResults: (results: ExtractionResultsByEye) => void
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

  const setResults = useCallback((nextResults: ExtractionResultsByEye) => {
    setResultsState(nextResults)
  }, [])

  const clearResults = useCallback(() => {
    setResultsState(emptyResults)
  }, [])

  const value = useMemo(
    () => ({
      results,
      hasResults: Boolean(results.LE || results.RE),
      setResults,
      clearResults,
    }),
    [clearResults, results, setResults]
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

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { ExtractionResult } from '../models/extraction'

export type ExtractionResultsByEye = {
  LE: ExtractionResult | null
  RE: ExtractionResult | null
}

export type ExtractionFilesByEye = {
  LE: File | null
  RE: File | null
}

export type ExtractionReportType = 'hvf' | 'vrvf'

type SingleExtractionWorkflowContextValue = {
  results: ExtractionResultsByEye
  uploadedFiles: ExtractionFilesByEye
  reportType: ExtractionReportType
  completedAt: Date | null
  hasResults: boolean
  setReportType: (reportType: ExtractionReportType) => void
  setResults: (
    results: ExtractionResultsByEye,
    reportType?: ExtractionReportType,
    uploadedFiles?: ExtractionFilesByEye
  ) => void
  clearResults: () => void
}

const emptyResults: ExtractionResultsByEye = {
  LE: null,
  RE: null,
}

const emptyFiles: ExtractionFilesByEye = {
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
  const [uploadedFiles, setUploadedFiles] = useState<ExtractionFilesByEye>(emptyFiles)
  const [reportType, setReportType] = useState<ExtractionReportType>('hvf')
  const [completedAt, setCompletedAt] = useState<Date | null>(null)

  const setResults = useCallback((
    nextResults: ExtractionResultsByEye,
    nextReportType?: ExtractionReportType,
    nextUploadedFiles?: ExtractionFilesByEye
  ) => {
    setResultsState(nextResults)
    if (nextUploadedFiles) {
      setUploadedFiles(nextUploadedFiles)
    }
    setCompletedAt(new Date())
    if (nextReportType) {
      setReportType(nextReportType)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResultsState(emptyResults)
    setUploadedFiles(emptyFiles)
    setCompletedAt(null)
  }, [])

  const value = useMemo(
    () => ({
      results,
      uploadedFiles,
      reportType,
      completedAt,
      hasResults: Boolean(results.LE || results.RE),
      setReportType,
      setResults,
      clearResults,
    }),
    [clearResults, completedAt, reportType, results, setResults, uploadedFiles]
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

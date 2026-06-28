/**
 * pages/ResultSingleExtractionPage.tsx — Displays completed single-extraction results.
 */

import { Navigate } from 'react-router-dom'
import { useSingleExtractionWorkflow } from '../context/SingleExtractionWorkflowContext'
import type { ExtractionResultsByEye } from '../context/SingleExtractionWorkflowContext'
import './ResultSingleExtractionPage.css'

type Eye = keyof ExtractionResultsByEye

export const ResultSingleExtractionPage = () => {
  const { results, hasResults } = useSingleExtractionWorkflow()

  if (!hasResults) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="result-single-extraction-page">
      <section className="extraction-results" aria-label="Extraction results">
        {([
          { eye: 'LE' as Eye, result: results.LE },
          { eye: 'RE' as Eye, result: results.RE },
        ]).map(({ eye, result }) =>
          result ? (
            <article className="extraction-result-panel" key={eye}>
              <header>
                <h2>{eye} Result</h2>
                <span>{result.filename}</span>
              </header>
              <pre>{JSON.stringify(result.raw_data, null, 2)}</pre>
            </article>
          ) : null
        )}
      </section>
    </div>
  )
}

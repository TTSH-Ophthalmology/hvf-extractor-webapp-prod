/**
 * components/layout/TopBar/WorkflowTabs.tsx — Input/Result workflow tab strip.
 *
 * VIEW: renders the two-step tab bar below the TopBar main row.
 * TODO: wire tab state to show extraction results when extraction is complete.
 */

import { useNavigate } from 'react-router-dom'
import { useSingleExtractionWorkflow } from '../../../context/SingleExtractionWorkflowContext'
import './WorkflowTabs.css'

export const WorkflowTabs = () => {
  const navigate = useNavigate()
  const { hasResults } = useSingleExtractionWorkflow()

  const handleResultClick = () => {
    if (hasResults) {
      navigate('/result')
    }
  }

  return (
    <div className="workflow-tabs" role="tablist" aria-label="Extraction workflow">
      <button
        className="workflow-tab workflow-tab-active"
        type="button"
        role="tab"
        aria-selected="true"
        onClick={() => navigate('/')}
      >
        Input Page
      </button>
      <button
        className={`workflow-tab${!hasResults ? ' workflow-tab-disabled' : ''}`}
        type="button"
        role="tab"
        aria-selected="false"
        aria-disabled={!hasResults}
        disabled={!hasResults}
        onClick={handleResultClick}
      >
        Result Page
      </button>
    </div>
  )
}

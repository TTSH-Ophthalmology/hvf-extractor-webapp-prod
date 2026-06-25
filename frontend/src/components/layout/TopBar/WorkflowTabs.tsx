/**
 * components/layout/TopBar/WorkflowTabs.tsx — Input/Result workflow tab strip.
 *
 * VIEW: renders the two-step tab bar below the TopBar main row.
 * TODO: wire tab state to show extraction results when extraction is complete.
 */

import './WorkflowTabs.css'

export const WorkflowTabs = () => {
  return (
    <div className="workflow-tabs" role="tablist" aria-label="Extraction workflow">
      <button
        className="workflow-tab workflow-tab-active"
        type="button"
        role="tab"
        aria-selected="true"
      >
        Input Page
      </button>
      <button
        className="workflow-tab"
        type="button"
        role="tab"
        aria-selected="false"
      >
        Result Page
      </button>
    </div>
  )
}

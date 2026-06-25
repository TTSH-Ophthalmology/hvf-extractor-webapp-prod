/**
 * pages/ReportsPage.tsx — Report templates (placeholder).
 *
 * VIEW: placeholder page for future clinical report builder.
 */

import { PageHeader } from '../components/ui/PageHeader'
import './ReportsPage.css'

export const ReportsPage = () => {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Prepare clinical summaries and export visual field insight reports."
      />

      <section className="reports-panel">
        <h3>Report builder</h3>
        <p>
          Report templates and export controls will live here as the workflow matures.
        </p>
      </section>
    </>
  )
}

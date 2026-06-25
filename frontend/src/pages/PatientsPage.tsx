/**
 * pages/PatientsPage.tsx — Patient records (placeholder).
 *
 * VIEW: placeholder page for the future patient management feature.
 */

import { PageHeader } from '../components/ui/PageHeader'
import './PatientsPage.css'

export const PatientsPage = () => {
  return (
    <>
      <PageHeader
        title="Patients"
        description="Search, register, and manage patient records before reviewing visual field tests."
      />

      <section className="empty-panel">
        <h3>Patient list</h3>
        <p>Connect this page to the backend patient API when the endpoint is ready.</p>
      </section>
    </>
  )
}

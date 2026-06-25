/**
 * pages/SettingsPage.tsx — Application settings (placeholder).
 *
 * VIEW: placeholder page for future app settings and preferences.
 */

import { PageHeader } from '../components/ui/PageHeader'
import './SettingsPage.css'

export const SettingsPage = () => {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure app preferences, backend connection settings, and local storage behaviour."
      />

      <section className="settings-panel">
        <h3>Application settings</h3>
        <p>
          Keep environment and integration settings separate from clinical workflows.
        </p>
      </section>
    </>
  )
}

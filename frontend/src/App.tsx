/**
 * App.tsx — Root component.
 *
 * Wraps all pages in AppShell (sidebar + topbar layout) and defines routes:
 *   /                → SingleExtractionPage  (upload + extract for both eyes)
 *   /visual-fields   → VisualFieldsPage      (batch extraction — placeholder)
 *   /reports         → ReportsPage           (report templates — placeholder)
 *   /patients        → PatientsPage          (patient records — placeholder)
 *   /settings        → SettingsPage          (app settings — placeholder)
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell/AppShell'
import { PatientsPage } from './pages/PatientsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SingleExtractionPage } from './pages/SingleExtractionPage'
import { VisualFieldsPage } from './pages/VisualFieldsPage'

export const App = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/"              element={<SingleExtractionPage />} />
        <Route path="/visual-fields" element={<VisualFieldsPage />} />
        <Route path="/reports"       element={<ReportsPage />} />
        <Route path="/patients"      element={<PatientsPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

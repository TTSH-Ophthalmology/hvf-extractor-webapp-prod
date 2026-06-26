/**
 * App.tsx — Root component.
 *
 * Defines public auth routes and protected app routes:
 *   /                → SingleExtractionPage  (upload + extract for both eyes)
 *   /visual-fields   → VisualFieldsPage      (batch extraction — placeholder)
 *   /reports         → ReportsPage           (report templates — placeholder)
 *   /patients        → PatientsPage          (patient records — placeholder)
 *   /settings        → SettingsPage          (app settings — placeholder)
 *   /token           → LoginPage
 *   /logout          → LogoutPage
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { PatientsPage } from './pages/PatientsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SingleExtractionPage } from './pages/SingleExtractionPage'
import { VisualFieldsPage } from './pages/VisualFieldsPage'
import { LoginPage } from './pages/LoginPage'
import { LogoutPage } from './pages/LogoutPage'
import { ProtectedLayout } from './route/ProtectedLayout'
import { ProtectedRoute } from './route/ProtectedRoute'

export const App = () => {
  return (
    <Routes>
      <Route path="/token"  element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/"              element={<SingleExtractionPage />} />
          <Route path="/visual-fields" element={<VisualFieldsPage />} />
          <Route path="/reports"       element={<ReportsPage />} />
          <Route path="/patients"      element={<PatientsPage />} />
          <Route path="/settings"      element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/token" replace />} />
    </Routes>
  )
}

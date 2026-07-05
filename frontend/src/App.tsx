/**
 * App.tsx — Root component.
 *
 * Defines public auth routes and protected app routes:
 *   /                → InputExtractionPage  (upload + extract for both eyes)
 *   /result          → ResultExtractionPage (extraction results)
 *   /token           → LoginPage
 *   /logout          → LogoutPage
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { InputExtractionPage } from './pages/Extraction/InputExtractionPage'
import { ResultExtractionPage } from './pages/Extraction/ResultExtractionPage'
import { ErrorPage } from './pages/Error/ErrorPage'
import { LoginPage } from './pages/LogInOut/LoginPage'
import { LogoutPage } from './pages/LogInOut/LogoutPage'
import { TemplatePage } from './pages/TemplatePage'
import { ProtectedLayout } from './route/ProtectedLayout'
import { ProtectedRoute } from './route/ProtectedRoute'

export const App = () => {
  return (
    <Routes>
      <Route path="/error"  element={<ErrorPage />} />
      <Route path="/token"  element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/"              element={<InputExtractionPage />} />
          <Route path="/result"        element={<ResultExtractionPage />} />
          <Route path="/templates"     element={<TemplatePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/token" replace />} />
    </Routes>
  )
}

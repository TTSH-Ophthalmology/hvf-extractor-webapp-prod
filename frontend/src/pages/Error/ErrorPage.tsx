import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import nhgeiLogo from '../../assets/images/NHGEI-logo.jpg'
import './ErrorPage.css'

type ErrorContent = {
  title: string
  message: string
  detail: string
}

const errorContentByCode: Record<string, ErrorContent> = {
  NETWORK: {
    title: 'Backend Unavailable',
    message: 'The app cannot reach the backend service right now.',
    detail: 'Check that the backend server is running, then try again.',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The backend took too long to respond.',
    detail: 'The server may be busy or starting up. Try again in a moment.',
  },
  404: {
    title: 'API Not Found',
    message: 'The requested backend endpoint was not found.',
    detail: 'This can happen when the frontend and backend routes are out of sync.',
  },
  500: {
    title: 'Server Error',
    message: 'The backend hit an internal error.',
    detail: 'Restart the backend and check the terminal logs for the traceback.',
  },
  502: {
    title: 'Bad Gateway',
    message: 'The app could not get a valid response from the backend.',
    detail: 'Check the backend process and proxy configuration.',
  },
  503: {
    title: 'Service Unavailable',
    message: 'The backend service is temporarily unavailable.',
    detail: 'The server may be down, restarting, or overloaded.',
  },
  504: {
    title: 'Gateway Timeout',
    message: 'The backend did not respond before the gateway timed out.',
    detail: 'Try again after the backend has finished processing or restarted.',
  },
}

const getErrorContent = (code: string): ErrorContent => {
  if (errorContentByCode[code]) {
    return errorContentByCode[code]
  }

  if (/^5\d\d$/.test(code)) {
    return errorContentByCode[500]
  }

  return {
    title: 'Application Error',
    message: 'Something went wrong while contacting the backend.',
    detail: 'Try again, or check the backend terminal if the problem continues.',
  }
}

export const ErrorPage = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code') ?? '500'
  const normalizedCode = code.toUpperCase()
  const content = getErrorContent(normalizedCode)

  return (
    <main className="error-page">
      <section className="error-shell" aria-label="Application error">
        <div className="error-hero" aria-hidden="true">
          <div className="error-hero-content">
            <p className="error-eyebrow">Tan Tock Seng Hospital</p>
            <h1>HVF Extractor</h1>
          </div>
        </div>

        <section className="error-card">
          <div className="error-card-header">
            <img
              className="error-hospital-logo"
              src={nhgeiLogo}
              alt="NHGEI logo"
            />
          </div>

          <div className="error-content">
            <div className="error-status">
              <div className="error-status-mark" aria-hidden="true">
                <AlertTriangle size={26} strokeWidth={2.4} />
              </div>
              <p className="error-code">ERROR {normalizedCode}</p>
            </div>
            <h2>{content.title}</h2>
            <p className="error-message">{content.message}</p>
            <p className="error-detail">{content.detail}</p>

            <div className="error-actions">
              <button
                className="error-primary-action"
                type="button"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={17} strokeWidth={2.3} />
                Retry
              </button>
              <Link className="error-secondary-action" to="/token">
                <Home size={17} strokeWidth={2.3} />
                Login
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

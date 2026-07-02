import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa'
import './ExtractionProgressOverlay.css'

export type ExtractionProgressOverlayVariant = 'loading' | 'success' | 'warning' | 'error'

type ExtractionProgressOverlayProps = {
  variant: ExtractionProgressOverlayVariant
  title: string
  message: string
  progress?: number
  actionLabel?: string
  onAction?: () => void
}

export const ExtractionProgressOverlay = ({
  variant,
  title,
  message,
  progress,
  actionLabel,
  onAction,
}: ExtractionProgressOverlayProps) => {
  const boundedProgress = progress === undefined
    ? undefined
    : Math.min(Math.max(progress, 0), 100)

  return (
    <div className="extraction-overlay" role="status" aria-live="polite">
      <div className={`extraction-overlay-box extraction-overlay-${variant}`}>
        <div className="extraction-overlay-mark" aria-hidden="true">
          {variant === 'loading' && <span className="extraction-overlay-spinner" />}
          {variant === 'success' && <FaCheckCircle size={28} />}
          {variant === 'warning' && <FaExclamationTriangle size={27} />}
          {variant === 'error' && <FaTimesCircle size={28} />}
        </div>

        <div className="extraction-overlay-copy">
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        {boundedProgress !== undefined && (
          <div
            className="extraction-overlay-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={boundedProgress}
          >
            <span style={{ width: `${boundedProgress}%` }} />
          </div>
        )}

        {actionLabel && onAction && (
          <button
            className="extraction-overlay-action"
            type="button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

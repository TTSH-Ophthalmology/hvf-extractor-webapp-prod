import type { ReactNode } from 'react'
import { FaEye } from 'react-icons/fa6'
import { RiEyeCloseFill } from 'react-icons/ri'
import type { EyeCode } from './types'

type EyeBoxProps = {
  abbreviation: EyeCode
  label: string
  hasSelectedFile: boolean
  children: ReactNode
}

export const EyeBox = ({
  abbreviation,
  label,
  hasSelectedFile,
  children,
}: EyeBoxProps) => {
  return (
    <section
      className={`eye-upload-panel${hasSelectedFile ? ' eye-upload-panel-uploaded' : ''}`}
      aria-labelledby={`${abbreviation}-title`}
    >
      <header className="eye-upload-header">
        <div className="eye-upload-title" id={`${abbreviation}-title`}>
          <span className="eye-code">{abbreviation}</span>
          <span>{label}</span>
        </div>
        {hasSelectedFile ? (
          <FaEye className="eye-status-mark" aria-hidden="true" />
        ) : (
          <RiEyeCloseFill className="eye-status-mark" aria-hidden="true" />
        )}
      </header>

      {children}
    </section>
  )
}

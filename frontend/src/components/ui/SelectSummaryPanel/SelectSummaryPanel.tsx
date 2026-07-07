/**
 * components/ui/SelectSummaryPanel/SelectSummaryPanel.tsx - Select dropdown with a large selected summary.
 *
 * VIEW: shared panel for compact selectors that show the current choice as a prominent label.
 */

import type { ReactNode } from 'react'
import { SelectFieldDropdown, type SelectFieldDropdownOption } from '../SelectFieldDropdown/SelectFieldDropdown'
import './SelectSummaryPanel.css'

type SelectSummaryPanelProps = {
  id: string
  label: string
  name: string
  options: SelectFieldDropdownOption[]
  value: string
  summary: string
  ariaLabel: string
  className?: string
  children?: ReactNode
  onChange: (value: string) => void
}

export const SelectSummaryPanel = ({
  id,
  label,
  name,
  options,
  value,
  summary,
  ariaLabel,
  className = '',
  children,
  onChange,
}: SelectSummaryPanelProps) => {
  const panelClassName = ['select-summary-panel', className].filter(Boolean).join(' ')

  return (
    <section className={panelClassName} aria-label={ariaLabel}>
      <div className="select-summary-content">
        <SelectFieldDropdown
          id={id}
          label={label}
          name={name}
          options={options}
          value={value}
          onChange={onChange}
        />
        <strong>{summary}</strong>
      </div>
      {children ? <div className="select-summary-support">{children}</div> : null}
    </section>
  )
}

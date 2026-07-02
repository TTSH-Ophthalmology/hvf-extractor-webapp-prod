/**
 * components/ui/Reports/ReportTypeSelector/ReportTypeSelector.tsx — HVF / VRVF report type picker.
 *
 * VIEW: wraps SelectFieldDropdown with report-type specific options.
 */

import './ReportTypeSelector.css'
import { SelectFieldDropdown } from '../../SelectFieldDropdown/SelectFieldDropdown'

export type ReportType = 'hvf' | 'vrvf'

type ReportTypeOption = {
  value: ReportType
  label: string
  abbreviation: string
}

type ReportTypeSelectorProps = {
  options: ReportTypeOption[]
  value: ReportType
  onChange: (value: ReportType) => void
}

export const ReportTypeSelector = ({ options, value, onChange }: ReportTypeSelectorProps) => {
  const selectedOption = options.find((o) => o.value === value) ?? options[0]

  return (
    <section className="report-type-panel" aria-label="Report type selection">
      <div className="report-type-content">
        <SelectFieldDropdown
          id="report-type"
          label="Select Report Type"
          name="report-type"
          options={options}
          value={value}
          onChange={(nextValue) => onChange(nextValue as ReportType)}
        />
        <strong>{selectedOption.abbreviation}</strong>
      </div>
    </section>
  )
}

/**
 * components/ui/Reports/ReportTypeSelector/ReportTypeSelector.tsx — HVF / VRVF report type picker.
 *
 * VIEW: wraps SelectFieldDropdown with report-type specific options.
 */

import { SelectSummaryPanel } from '../../SelectSummaryPanel/SelectSummaryPanel'
import './ReportTypeSelector.css'

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
    <SelectSummaryPanel
      id="report-type"
      label="Select Report Type"
      name="report-type"
      options={options}
      value={value}
      summary={selectedOption.abbreviation}
      ariaLabel="Report type selection"
      className="report-type-selector-panel"
      onChange={(nextValue) => onChange(nextValue as ReportType)}
    />
  )
}

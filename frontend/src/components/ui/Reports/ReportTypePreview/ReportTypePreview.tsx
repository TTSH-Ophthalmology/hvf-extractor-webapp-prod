/**
 * components/ui/Reports/ReportTypePreview/ReportTypePreview.tsx — Read-only HVF / VRVF report type display.
 */

import type { ReportType } from '../ReportTypeSelector/ReportTypeSelector'
import './ReportTypePreview.css'

type ReportTypeOption = {
  value: ReportType
  label: string
  abbreviation: string
}

type ReportTypePreviewProps = {
  options: ReportTypeOption[]
  value: ReportType
}

export const ReportTypePreview = ({ options, value }: ReportTypePreviewProps) => {
  const selectedOption = options.find((o) => o.value === value) ?? options[0]

  return (
    <section className="report-type-preview-panel" aria-label="Selected report type">
      <div className="report-type-preview-content">
        <strong className="report-type-preview-abbreviation">
          {selectedOption.abbreviation}
        </strong>
      </div>
    </section>
  )
}

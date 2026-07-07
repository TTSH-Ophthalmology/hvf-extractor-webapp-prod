/**
 * components/template/TemplateMappingDetails/TemplateMappingDetails.tsx - Template mapping summary table.
 *
 * VIEW: displays parsed template sections, types, and label counts.
 */

import './TemplateMappingDetails.css'

export type TemplateMappingRow = {
  section: string
  type: string
  labels: string
}

type TemplateMappingDetailsProps = {
  rows: TemplateMappingRow[]
}

export const TemplateMappingDetails = ({ rows }: TemplateMappingDetailsProps) => (
  <section className="template-card template-mapping-card" aria-labelledby="template-mapping-title">
    <h2 id="template-mapping-title">Mapping Details</h2>
    <div className="template-mapping-table-frame">
      <table className="template-mapping-table">
        <thead>
          <tr>
            <th>Section</th>
            <th>Type</th>
            <th>Labels</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.section}>
              <td>{row.section}</td>
              <td>{row.type}</td>
              <td>{row.labels}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)

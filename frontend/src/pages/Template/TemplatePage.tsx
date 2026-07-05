/**
 * pages/Template/TemplatePage.tsx - Template editor overlay.
 *
 * VIEW: overlays the workspace with a focused template editor panel.
 */

import { Braces, CircleCheck, Copy, FileJson, Save, X } from 'lucide-react'
import { useMemo } from 'react'
import './TemplatePage.css'

const editorTemplate = {
  LE: {
    header: {
      crop_region: [0, 524, 2485, 471],
      type: 'text',
      labels: [
        'Fixation Monitor',
        'Fixation Target',
        'Fixation Losses',
        'False POS Errors',
        'False NEG Errors',
        'Test Duration',
        'Fovea',
        'Stimulus',
        'Background',
        'Strategy',
        'Pupil Diameter',
        'Visual Acuity',
        'Rx',
        'Date',
        'Time',
        'Age',
      ],
    },
    threshold_map: {
      crop_region: [463, 932, 899, 688],
      type: 'map',
      labels: ['ST1', 'ST2', 'SN2', 'SN1', 'ST3', 'ST4', 'ST5', 'SN5'],
    },
    total_deviation: {
      crop_region: [207, 1608, 630, 529],
      type: 'map_signed',
      labels: ['ST1', 'ST2', 'SN2', 'SN1', 'ST3', 'ST4'],
    },
    pattern_deviation: {
      crop_region: [1006, 1593, 639, 584],
      type: 'map_signed',
      labels: ['ST1', 'ST2', 'SN2', 'SN1', 'ST3', 'ST4'],
    },
    ght_vfi: {
      crop_region: [1685, 1935, 640, 280],
      type: 'text',
      labels: ['GHT', 'VFI24-2', 'MD24-2', 'PSD24-2'],
    },
  },
}

const mappingRows = [
  { section: 'header', type: 'text', labels: '16' },
  { section: 'threshold_map', type: 'map', labels: '54' },
  { section: 'total_deviation', type: 'map_signed', labels: '52 (LE/RE)' },
  { section: 'pattern_deviation', type: 'map_signed', labels: '52 (LE/RE)' },
  { section: 'ght_vfi', type: 'text', labels: '4' },
]

type TemplatePageProps = {
  onClose: () => void
}

export const TemplatePage = ({ onClose }: TemplatePageProps) => {
  const editorText = useMemo(() => JSON.stringify(editorTemplate, null, 2), [])
  const lineCount = editorText.split('\n').length

  return (
    <div className="template-overlay" role="dialog" aria-modal="true" aria-labelledby="template-title">
      <div className="template-backdrop" aria-hidden="true" />

      <section className="template-modal">
        <button
          className="template-close-button"
          type="button"
          aria-label="Close templates"
          title="Close templates"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2} />
        </button>

        <div className="template-intro">
          <h1 id="template-title">Output Templates</h1>
        </div>

        <div className="template-layout" aria-label="Template details">
          <p className="template-description">
            Define field extraction regions and metadata mapping for medical reports.
          </p>

          <div className="template-card template-select-card">
            <label htmlFor="template-select">Select Template</label>
            <div className="template-select-row">
              <select id="template-select" defaultValue="HVF.json">
                <option>HVF.json</option>
                <option>VRVF.json</option>
              </select>
              <strong>HVF</strong>
            </div>
            <div className="template-editing-status">
              <Braces size={14} strokeWidth={2.2} />
              <span>
                Editing:
                <br />
                data/templates/HVF.json
              </span>
            </div>
          </div>

          <div className="template-card template-mapping-card">
            <h2>Mapping Details</h2>
            <table className="template-mapping-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Type</th>
                  <th>Labels</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((row) => (
                  <tr key={row.section}>
                    <td>{row.section}</td>
                    <td>{row.type}</td>
                    <td>{row.labels}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="template-save-status">
              <CircleCheck size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>Template saved completed at 14:30</span>
            </div>
          </div>

          <section className="template-editor-panel" aria-label="Template JSON editor">
            <header className="template-editor-header">
              <div>
                <Braces size={20} strokeWidth={2.2} />
                <h2>Template Editor (JSON)</h2>
              </div>
              <button type="button" aria-label="Copy template JSON" title="Copy template JSON">
                <Copy size={18} strokeWidth={2} />
              </button>
            </header>

            <pre className="template-code-window" aria-label="Template JSON preview">
              <code>{editorText}</code>
            </pre>

            <footer className="template-editor-footer">
              <span>
                Characters: {editorText.length} | Lines: {lineCount}
              </span>
              <div className="template-editor-actions">
                <button className="template-secondary-button" type="button">
                  <FileJson size={15} strokeWidth={2} />
                  <span>Import Template</span>
                </button>
                <button className="template-primary-button" type="button">
                  <Save size={15} strokeWidth={2} />
                  <span>Save</span>
                </button>
              </div>
            </footer>
          </section>
        </div>
      </section>
    </div>
  )
}

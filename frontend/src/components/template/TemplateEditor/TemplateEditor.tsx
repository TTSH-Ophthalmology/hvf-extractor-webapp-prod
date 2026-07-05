/**
 * components/template/TemplateEditor/TemplateEditor.tsx - Editable JSON template panel.
 */

import { Braces, CircleAlert, CircleCheck, Copy, FileJson, Save } from 'lucide-react'
import { useRef } from 'react'
import { AiOutlineEdit } from 'react-icons/ai'
import './TemplateEditor.css'

type StatusTone = 'neutral' | 'success' | 'warning' | 'error'

type TemplateEditorProps = {
  editorText: string
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  statusMessage: string
  statusTone: StatusTone
  selectedTemplate: string
  onChange: (value: string) => void
  onCopy: () => void
  onImport: (file: File) => void
  onSave: () => void
}

export const TemplateEditor = ({
  editorText,
  isDirty,
  isLoading,
  isSaving,
  statusMessage,
  statusTone,
  selectedTemplate,
  onChange,
  onCopy,
  onImport,
  onSave,
}: TemplateEditorProps) => {
  const importInputRef = useRef<HTMLInputElement>(null)
  const StatusIcon =
    statusTone === 'error' ? CircleAlert : statusTone === 'warning' ? AiOutlineEdit : CircleCheck
  const canSave = isDirty && !isLoading && !isSaving

  return (
    <section className="template-editor-panel" aria-label="Template JSON editor">
      <header className="template-editor-header">
        <div>
          <Braces size={20} strokeWidth={2.2} />
          <h2>Template Editor (JSON)</h2>
        </div>
        <button
          type="button"
          aria-label="Copy template JSON"
          title="Copy template JSON"
          disabled={isLoading || editorText.length === 0}
          onClick={onCopy}
        >
          <Copy size={18} strokeWidth={2} />
        </button>
      </header>

      <textarea
        className="template-code-window"
        aria-label={`${selectedTemplate} JSON editor`}
        value={isLoading ? 'Loading template...' : editorText}
        spellCheck={false}
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
      />

      <footer className="template-editor-footer">
        {statusMessage ? (
          <span className={`template-save-status-text template-save-status-text-${statusTone}`} title={statusMessage}>
            <StatusIcon className="template-save-status-icon" size={21} strokeWidth={2} aria-hidden="true" />
            <span>{statusMessage}</span>
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="template-editor-actions">
          <input
            ref={importInputRef}
            className="template-import-input"
            type="file"
            accept=".json,application/json"
            aria-label="Import template JSON file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onImport(file)
              }
              event.target.value = ''
            }}
          />
          <button
            className="template-secondary-button"
            type="button"
            disabled={isLoading || isSaving}
            onClick={() => importInputRef.current?.click()}
          >
            <FileJson size={15} strokeWidth={2} />
            <span>Import Template</span>
          </button>
          <button
            className="template-primary-button"
            type="button"
            disabled={!canSave}
            onClick={onSave}
          >
            <Save size={15} strokeWidth={2} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </footer>
    </section>
  )
}

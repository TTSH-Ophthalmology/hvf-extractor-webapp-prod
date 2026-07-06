/**
 * pages/Template/TemplatePage.tsx - Template editor overlay.
 *
 * VIEW: overlays the workspace with a focused template editor panel.
 */

import { X } from 'lucide-react'
import { IoInformationCircleOutline } from 'react-icons/io5'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { TemplateEditor } from '../../components/template/TemplateEditor/TemplateEditor'
import {
  TemplateMappingDetails,
  type TemplateMappingRow,
} from '../../components/template/TemplateMappingDetails/TemplateMappingDetails'
import { SelectSummaryPanel } from '../../components/ui/SelectSummaryPanel/SelectSummaryPanel'
import { getTemplate, listTemplates, saveTemplate } from '../../services/templateService'
import type { TemplateJson } from '../../models/template'
import './TemplatePage.css'

type TemplatePageProps = {
  onClose: () => void
}

type SaveStatusTone = 'neutral' | 'success' | 'warning' | 'error'

const DEFAULT_TEMPLATES = ['HVF.json', 'VRVF.json']

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (axios.isCancel(error)) {
    return ''
  }

  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail === 'Not authenticated' ? 'Login required' : detail
    }
  }

  return error instanceof Error ? error.message : fallback
}

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return 'Invalid JSON'
  }

  const message = getRequestErrorMessage(error, 'Save failed')
  return message.length > 18 ? 'Save failed' : message
}

function getFormattedSavedAt(): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(new Date())
}

function parseTemplateJson(text: string): TemplateJson {
  const parsedTemplate = JSON.parse(text)

  if (!parsedTemplate || typeof parsedTemplate !== 'object' || Array.isArray(parsedTemplate)) {
    throw new Error('Template JSON must be an object.')
  }

  return parsedTemplate as TemplateJson
}

function buildMappingRows(editorText: string): TemplateMappingRow[] {
  try {
    const content = JSON.parse(editorText) as Record<string, Record<string, { labels?: unknown[]; type?: string }>>
    const firstEye = content.LE ?? content.RE ?? Object.values(content)[0]

    if (!firstEye || typeof firstEye !== 'object') {
      return []
    }

    return Object.entries(firstEye).map(([section, value]) => ({
      section,
      type: value?.type ?? '-',
      labels: Array.isArray(value?.labels) ? String(value.labels.length) : '-',
    }))
  } catch {
    return []
  }
}

export const TemplatePage = ({ onClose }: TemplatePageProps) => {
  const [templates, setTemplates] = useState<string[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState('HVF.json')
  const [editorText, setEditorText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatusMessage, setSaveStatusMessage] = useState('')
  const [lastSavedMessage, setLastSavedMessage] = useState('')
  const [saveStatusTone, setSaveStatusTone] = useState<SaveStatusTone>('neutral')

  const selectedTemplateLabel = selectedTemplate.replace(/\.json$/i, '')
  const isDirty = editorText !== savedText
  const mappingRows = useMemo(() => buildMappingRows(editorText), [editorText])
  const templateOptions = useMemo(
    () => templates.map((template) => ({ value: template, label: template })),
    [templates],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadTemplateList() {
      try {
        const templateNames = await listTemplates(controller.signal)
        if (templateNames.length > 0) {
          setTemplates(templateNames)
          setSelectedTemplate((currentTemplate) =>
            templateNames.includes(currentTemplate) ? currentTemplate : templateNames[0],
          )
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = getRequestErrorMessage(
            error,
            'Load failed',
          )

          if (message) {
            setSaveStatusMessage(message)
            setSaveStatusTone('error')
          }
        }
      }
    }

    loadTemplateList()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadSelectedTemplate() {
      setIsLoading(true)
      setSaveStatusMessage('')
      setLastSavedMessage('')
      setSaveStatusTone('neutral')

      try {
        const template = await getTemplate(selectedTemplate, controller.signal)
        const nextText = JSON.stringify(template.content, null, 2)
        setEditorText(nextText)
        setSavedText(nextText)
      } catch (error) {
        if (!controller.signal.aborted) {
          setEditorText('')
          setSavedText('')
          const message = getRequestErrorMessage(error, 'Load failed')
          setSaveStatusMessage(message || 'Load failed')
          setSaveStatusTone('error')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadSelectedTemplate()

    return () => controller.abort()
  }, [selectedTemplate])

  function handleTemplateChange(value: string) {
    setSelectedTemplate(value)
  }

  function handleEditorChange(value: string) {
    setEditorText(value)

    if (value !== savedText) {
      setSaveStatusMessage('Unsaved changes')
      setSaveStatusTone('warning')
    } else {
      setSaveStatusMessage(lastSavedMessage)
      setSaveStatusTone(lastSavedMessage ? 'success' : 'neutral')
    }
  }

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(editorText)
      } else {
        const copyBuffer = document.createElement('textarea')
        copyBuffer.value = editorText
        copyBuffer.style.position = 'fixed'
        copyBuffer.style.left = '-9999px'
        document.body.appendChild(copyBuffer)
        copyBuffer.select()
        document.execCommand('copy')
        document.body.removeChild(copyBuffer)
      }
      setSaveStatusMessage('Copied')
      setSaveStatusTone('success')
    } catch {
      setSaveStatusMessage('Copy failed')
      setSaveStatusTone('error')
    }
  }

  async function handleImport(file: File) {
    setIsSaving(true)
    setSaveStatusMessage('Importing...')
    setSaveStatusTone('neutral')

    try {
      const importedText = await file.text()
      const parsedTemplate = parseTemplateJson(importedText)
      const savedTemplate = await saveTemplate(selectedTemplate, parsedTemplate)
      const nextText = JSON.stringify(savedTemplate.content, null, 2)
      setEditorText(nextText)
      setSavedText(nextText)

      const nextSavedMessage = `Saved changes at ${getFormattedSavedAt()}`
      setLastSavedMessage(nextSavedMessage)
      setSaveStatusMessage(nextSavedMessage)
      setSaveStatusTone('success')
    } catch (error) {
      setSaveStatusMessage(getSaveErrorMessage(error))
      setSaveStatusTone('error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSave() {
    if (!isDirty) {
      setSaveStatusMessage(lastSavedMessage)
      setSaveStatusTone(lastSavedMessage ? 'success' : 'neutral')
      return
    }

    setIsSaving(true)
    setSaveStatusMessage('Saving...')
    setSaveStatusTone('neutral')

    try {
      const parsedTemplate = parseTemplateJson(editorText)
      const savedTemplate = await saveTemplate(selectedTemplate, parsedTemplate)
      const nextText = JSON.stringify(savedTemplate.content, null, 2)
      setEditorText(nextText)
      setSavedText(nextText)
      const nextSavedMessage = `Saved changes at ${getFormattedSavedAt()}`
      setLastSavedMessage(nextSavedMessage)
      setSaveStatusMessage(nextSavedMessage)
      setSaveStatusTone('success')
    } catch (error) {
      setSaveStatusMessage(getSaveErrorMessage(error))
      setSaveStatusTone('error')
    } finally {
      setIsSaving(false)
    }
  }

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

          <SelectSummaryPanel
            id="template-select"
            label="Select Template"
            name="template-select"
            options={templateOptions}
            value={selectedTemplate}
            summary={selectedTemplateLabel}
            ariaLabel="Template selection"
            className="template-select-card"
            onChange={handleTemplateChange}
          >
            <div className="template-editing-status">
              <IoInformationCircleOutline size={17} aria-hidden="true" />
              <span>
                <strong>Editing:</strong>
                <br />
                data/templates/{selectedTemplate}
              </span>
            </div>
          </SelectSummaryPanel>

          <TemplateMappingDetails rows={mappingRows} />

          <TemplateEditor
            editorText={editorText}
            isDirty={isDirty}
            isLoading={isLoading}
            isSaving={isSaving}
            statusMessage={saveStatusMessage}
            statusTone={saveStatusTone}
            selectedTemplate={selectedTemplate}
            onChange={handleEditorChange}
            onCopy={handleCopy}
            onImport={handleImport}
            onSave={handleSave}
          />
        </div>
      </section>
    </div>
  )
}

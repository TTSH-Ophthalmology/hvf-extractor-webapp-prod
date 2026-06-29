import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { BiTable } from 'react-icons/bi'
import { FiCode } from 'react-icons/fi'
import { MdArrowDropDown } from 'react-icons/md'
import './DownloadDataButton.css'

type DownloadFormat = 'csv' | 'json'

type DownloadRow = {
  eye: string
  rawData: Record<string, string>
}

type DownloadDataButtonProps = {
  rows: DownloadRow[]
  fieldNames: string[]
  filenamePrefix?: string
}

const escapeCsvValue = (value: string) => {
  if (!/[",\n\r]/.test(value)) return value

  return `"${value.replace(/"/g, '""')}"`
}

const buildCsv = (rows: DownloadRow[], fieldNames: string[]) => {
  const headers = ['EYE', ...fieldNames]
  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      [row.eye, ...fieldNames.map((fieldName) => row.rawData[fieldName] ?? '')]
        .map(escapeCsvValue)
        .join(',')
    ),
  ]

  return csvRows.join('\n')
}

const buildJson = (rows: DownloadRow[], fieldNames: string[]) => {
  return JSON.stringify(
    rows.map((row) =>
      fieldNames.reduce(
        (acc, fieldName) => ({
          ...acc,
          [fieldName]: row.rawData[fieldName] ?? '',
        }),
        { EYE: row.eye }
      )
    ),
    null,
    2
  )
}

const downloadFile = (content: string, format: DownloadFormat, filenamePrefix: string) => {
  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
  const extension = format === 'csv' ? 'csv' : 'json'
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${filenamePrefix}.${extension}`
  link.click()
  URL.revokeObjectURL(url)
}

export const DownloadDataButton = ({
  rows,
  fieldNames,
  filenamePrefix = 'single-extraction-results',
}: DownloadDataButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDownload = (format: DownloadFormat) => {
    const content = format === 'csv' ? buildCsv(rows, fieldNames) : buildJson(rows, fieldNames)
    downloadFile(content, format, filenamePrefix)
    setMenuOpen(false)
  }

  return (
    <div className="download-data-button" ref={containerRef}>
      <button
        className="download-data-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Download size={16} strokeWidth={2.5} />
        <span>Download</span>
        <MdArrowDropDown size={22} color="#c5d0e8" />
      </button>

      {menuOpen && (
        <div className="download-data-menu" role="menu">
          <button
            type="button"
            className="download-data-menu-item"
            onClick={() => handleDownload('csv')}
          >
            <BiTable size={18} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="download-data-menu-item"
            onClick={() => handleDownload('json')}
          >
            <FiCode size={18} />
            <span>JSON</span>
          </button>
        </div>
      )}
    </div>
  )
}

import { Download } from 'lucide-react'
import './DownloadDataButton.css'

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

const downloadCsv = (content: string, filenamePrefix: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${filenamePrefix}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export const DownloadDataButton = ({
  rows,
  fieldNames,
  filenamePrefix = 'extraction-results',
}: DownloadDataButtonProps) => {
  const handleDownload = () => {
    downloadCsv(buildCsv(rows, fieldNames), filenamePrefix)
  }

  return (
    <button
      className="download-data-trigger"
      type="button"
      onClick={handleDownload}
    >
      <Download size={15} strokeWidth={3} />
      <span>Download</span>
    </button>
  )
}

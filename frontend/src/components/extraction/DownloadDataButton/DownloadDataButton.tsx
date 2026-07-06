import { Download } from 'lucide-react'
import './DownloadDataButton.css'

type DownloadRow = {
  eye: string
  filename: string
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
  const headers = ['EYE', 'FILE', ...fieldNames]
  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) =>
      [row.eye, row.filename, ...fieldNames.map((fieldName) => row.rawData[fieldName] ?? '')]
        .map(escapeCsvValue)
        .join(',')
    ),
  ]

  return csvRows.join('\n')
}

const formatDownloadDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)

  return `${day}${month}${year}`
}

const downloadCsv = (content: string, filenamePrefix: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${formatDownloadDate(new Date())}-${filenamePrefix}.csv`
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

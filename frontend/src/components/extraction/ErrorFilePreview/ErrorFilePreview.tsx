import { FilePreview } from '../../ui/Upload/FilePreview/FilePreview'

type ErrorFilePreviewProps = {
  filename: string
  size: number
  reason: string
}

const getDisplayErrorReason = (reason: string) => {
  const normalizedReason = reason.toLowerCase()
  const isFileTypeError =
    normalizedReason.includes('file type') ||
    normalizedReason.includes('not allowed') ||
    normalizedReason.includes('expected a pdf') ||
    normalizedReason.includes('expected pdf') ||
    normalizedReason.includes('unsupported file')

  return isFileTypeError ? 'File type not supported' : reason
}

export const ErrorFilePreview = ({
  filename,
  size,
  reason,
}: ErrorFilePreviewProps) => {
  return (
    <FilePreview
      variant="error"
      files={[
        {
          name: filename,
          size,
          errorReason: getDisplayErrorReason(reason),
        },
      ]}
    />
  )
}

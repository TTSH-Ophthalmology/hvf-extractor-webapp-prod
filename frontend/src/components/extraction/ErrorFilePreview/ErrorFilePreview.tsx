import { FilePreview } from '../../ui/Upload/FilePreview/FilePreview'

type ErrorFilePreviewProps = {
  filename: string
  size: number
  reason: string
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
          errorReason: reason,
        },
      ]}
    />
  )
}

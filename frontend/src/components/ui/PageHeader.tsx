/**
 * components/ui/PageHeader.tsx — Page title + description block.
 *
 * VIEW: reusable header used at the top of each page.
 */

import './PageHeader.css'

type PageHeaderProps = {
  title: string
  description: string
}

export const PageHeader = ({ title, description }: PageHeaderProps) => {
  return (
    <section className="page-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  )
}

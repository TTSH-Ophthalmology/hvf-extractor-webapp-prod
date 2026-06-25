/**
 * components/ui/StatCard.tsx — Metric display card.
 *
 * VIEW: displays a labelled value with supplementary detail text.
 */

import './StatCard.css'

type StatCardProps = {
  label: string
  value: string
  detail: string
}

export const StatCard = ({ label, value, detail }: StatCardProps) => {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  subtitleColor?: string
}

export default function StatCard({ icon, label, value, subtitle, subtitleColor }: Props) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className={`text-xs mt-1 ${subtitleColor || 'text-text-muted'}`}>{subtitle}</div>
      )}
    </div>
  )
}

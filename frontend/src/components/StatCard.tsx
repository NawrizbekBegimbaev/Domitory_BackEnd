import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  subtitleColor?: string
  onClick?: () => void
}

export default function StatCard({ icon, label, value, subtitle, subtitleColor, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-dark-card border border-dark-border rounded-xl p-5 transition-colors ${onClick ? 'cursor-pointer hover:border-accent' : 'hover:border-dark-hover'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-secondary text-sm">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-dark-bg flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {subtitle && (
        <div className={`text-xs mt-1.5 ${subtitleColor || 'text-text-muted'}`}>{subtitle}</div>
      )}
    </div>
  )
}

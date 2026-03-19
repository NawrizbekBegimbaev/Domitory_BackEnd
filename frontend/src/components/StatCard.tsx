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
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-dark-hover transition-colors">
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

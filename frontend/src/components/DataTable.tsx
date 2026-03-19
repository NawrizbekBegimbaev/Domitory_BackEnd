import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyText?: string
}

export default function DataTable<T extends { id?: string }>({
  columns, data, onRowClick, emptyText = 'Нет данных',
}: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border bg-dark-bg/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-[11px] text-text-muted font-semibold uppercase tracking-wider py-3.5 px-4 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-16 text-text-muted text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={item.id || i}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-dark-border/30 ${
                  onRowClick ? 'cursor-pointer hover:bg-accent/5' : ''
                } transition-all duration-150`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3.5 px-4 text-sm ${col.className || ''}`}>
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, unknown>)[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

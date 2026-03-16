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
          <tr className="border-b border-dark-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-xs text-text-muted font-medium uppercase tracking-wider py-3 px-4 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={item.id || i}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-dark-border/50 ${
                  onRowClick ? 'cursor-pointer hover:bg-dark-hover' : ''
                } transition-colors`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 text-sm ${col.className || ''}`}>
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

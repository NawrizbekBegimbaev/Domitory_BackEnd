export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('ru-RU').format(num)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const statusLabels: Record<string, string> = {
  active: 'Активный',
  evicted: 'Выселен',
  graduated: 'Выпустился',
  suspended: 'Приостановлен',
  available: 'Есть места',
  full: 'Занята',
  maintenance: 'Ремонт',
  closed: 'Закрыта',
  pending: 'Ожидает',
  partially_paid: 'Частично',
  paid: 'Оплачено',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
  completed: 'Завершён',
  terminated: 'Расторгнут',
  expired: 'Истёк',
  transferred: 'Переведён',
}

export const statusColors: Record<string, string> = {
  active: 'text-green-500',
  evicted: 'text-red-500',
  graduated: 'text-blue-400',
  suspended: 'text-yellow-500',
  available: 'text-green-500',
  full: 'text-red-500',
  maintenance: 'text-yellow-500',
  closed: 'text-gray-500',
  pending: 'text-yellow-500',
  partially_paid: 'text-orange-400',
  paid: 'text-green-500',
  overdue: 'text-red-500',
  cancelled: 'text-gray-500',
  completed: 'text-green-500',
  terminated: 'text-red-500',
  expired: 'text-gray-500',
  transferred: 'text-blue-400',
}

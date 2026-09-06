/** ISO 3166-1 alpha-2 codes. Uzbekistan first, then neighbours and frequent partner countries. */
export const HOME_COUNTRY = 'UZ'

export const countries: { code: string; name: string }[] = [
  { code: 'UZ', name: 'Узбекистан' },
  { code: 'KZ', name: 'Казахстан' },
  { code: 'KG', name: 'Кыргызстан' },
  { code: 'TJ', name: 'Таджикистан' },
  { code: 'TM', name: 'Туркменистан' },
  { code: 'RU', name: 'Россия' },
  { code: 'AF', name: 'Афганистан' },
  { code: 'AZ', name: 'Азербайджан' },
  { code: 'BD', name: 'Бангладеш' },
  { code: 'BY', name: 'Беларусь' },
  { code: 'CN', name: 'Китай' },
  { code: 'DE', name: 'Германия' },
  { code: 'EG', name: 'Египет' },
  { code: 'FR', name: 'Франция' },
  { code: 'GB', name: 'Великобритания' },
  { code: 'GE', name: 'Грузия' },
  { code: 'IN', name: 'Индия' },
  { code: 'ID', name: 'Индонезия' },
  { code: 'IR', name: 'Иран' },
  { code: 'IQ', name: 'Ирак' },
  { code: 'IT', name: 'Италия' },
  { code: 'JP', name: 'Япония' },
  { code: 'JO', name: 'Иордания' },
  { code: 'KR', name: 'Южная Корея' },
  { code: 'MN', name: 'Монголия' },
  { code: 'MY', name: 'Малайзия' },
  { code: 'NG', name: 'Нигерия' },
  { code: 'PK', name: 'Пакистан' },
  { code: 'SA', name: 'Саудовская Аравия' },
  { code: 'SY', name: 'Сирия' },
  { code: 'TR', name: 'Турция' },
  { code: 'UA', name: 'Украина' },
  { code: 'US', name: 'США' },
  { code: 'VN', name: 'Вьетнам' },
  { code: 'YE', name: 'Йемен' },
  { code: 'XX', name: 'Другая страна' },
]

export function countryName(code: string | undefined | null): string {
  if (!code) return '—'
  return countries.find((c) => c.code === code.toUpperCase())?.name || code.toUpperCase()
}

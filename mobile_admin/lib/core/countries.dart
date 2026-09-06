/// ISO 3166-1 alpha-2 codes. Mirrors frontend/src/utils/countries.ts.
const homeCountry = 'UZ';

const countries = <String, String>{
  'UZ': 'Узбекистан',
  'KZ': 'Казахстан',
  'KG': 'Кыргызстан',
  'TJ': 'Таджикистан',
  'TM': 'Туркменистан',
  'RU': 'Россия',
  'AF': 'Афганистан',
  'AZ': 'Азербайджан',
  'BD': 'Бангладеш',
  'BY': 'Беларусь',
  'CN': 'Китай',
  'DE': 'Германия',
  'EG': 'Египет',
  'FR': 'Франция',
  'GB': 'Великобритания',
  'GE': 'Грузия',
  'IN': 'Индия',
  'ID': 'Индонезия',
  'IR': 'Иран',
  'IQ': 'Ирак',
  'IT': 'Италия',
  'JP': 'Япония',
  'JO': 'Иордания',
  'KR': 'Южная Корея',
  'MN': 'Монголия',
  'MY': 'Малайзия',
  'NG': 'Нигерия',
  'PK': 'Пакистан',
  'SA': 'Саудовская Аравия',
  'SY': 'Сирия',
  'TR': 'Турция',
  'UA': 'Украина',
  'US': 'США',
  'VN': 'Вьетнам',
  'YE': 'Йемен',
  'XX': 'Другая страна',
};

String countryName(dynamic code) {
  if (code == null) return '-';
  final c = code.toString().toUpperCase();
  return countries[c] ?? c;
}

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import ru from './ru'
import uz from './uz'
import kk from './kk'

type Lang = 'ru' | 'uz' | 'kk'
type Translations = typeof ru

const translations: Record<Lang, Translations> = { ru, uz, kk }

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: keyof Translations) => string
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => String(key),
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'ru'
  })

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  const t = (key: keyof Translations): string => {
    return translations[lang][key] || translations.ru[key] || String(key)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export type { Lang, Translations }

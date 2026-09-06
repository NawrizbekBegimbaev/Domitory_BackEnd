import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '../types'

const CurrentUserContext = createContext<User | null>(null)

export function CurrentUserProvider({ user, children }: { user: User | null; children: ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
}

/** Logged-in user from App state (no extra /auth/me request). */
export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

export const GLOBAL_ROLES = ['platform_admin', 'ministry']

/** platform_admin and ministry see every university and can pick one in the sidebar. */
export function isGlobalRole(user: User | null) {
  return !!user?.role && GLOBAL_ROLES.includes(user.role.name)
}

/** ministry can only look, never change anything. */
export function isReadOnly(user: User | null) {
  return user?.role?.name === 'ministry'
}

export const SCOPE_KEY = 'scope_university'

export function getScopeUniversity(): string {
  try { return localStorage.getItem(SCOPE_KEY) || '' } catch { return '' }
}

export function setScopeUniversity(id: string) {
  try {
    if (id) localStorage.setItem(SCOPE_KEY, id)
    else localStorage.removeItem(SCOPE_KEY)
  } catch { /* ignore */ }
}

import { writable } from 'svelte/store'

const STORAGE_KEY = 'clash-nivo:luci-token'

function createAuthStore() {
  const initial = sessionStorage.getItem(STORAGE_KEY) ?? null
  const { subscribe, set, update } = writable<string | null>(initial)

  return {
    subscribe,
    setToken(token: string) {
      sessionStorage.setItem(STORAGE_KEY, token)
      set(token)
    },
    clearToken() {
      sessionStorage.removeItem(STORAGE_KEY)
      set(null)
    },
    update
  }
}

export const authStore = createAuthStore()

/** Synchronously read the current token without subscribing. */
export function getToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

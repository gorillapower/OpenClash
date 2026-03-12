import { writable } from 'svelte/store'

export type ToastVariant = 'default' | 'error' | 'success'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([])

  return {
    subscribe,
    add(message: string, variant: ToastVariant = 'default') {
      const id = crypto.randomUUID()
      update((toasts) => [...toasts, { id, message, variant }])
      setTimeout(() => this.dismiss(id), 5000)
    },
    error(message: string) {
      this.add(message, 'error')
    },
    success(message: string) {
      this.add(message, 'success')
    },
    dismiss(id: string) {
      update((toasts) => toasts.filter((t) => t.id !== id))
    }
  }
}

export const toasts = createToastStore()

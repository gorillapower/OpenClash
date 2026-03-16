import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

// crypto.randomUUID requires a secure context (HTTPS). Polyfill for HTTP (router LAN).
if (!crypto.randomUUID) {
  crypto.randomUUID = () =>
    '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    ) as `${string}-${string}-${string}-${string}-${string}`
}

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app

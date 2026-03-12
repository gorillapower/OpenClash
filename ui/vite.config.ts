import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { mockRpcPlugin } from './mock-rpc-plugin'

const proxyPrefixes = ['/cgi-bin', '/rpc', '/api']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const routerTarget = env.VITE_ROUTER_URL || 'http://192.168.1.1'
  const useMock = env.VITE_MOCK === 'true'

  const serverPlugins = useMock ? [mockRpcPlugin()] : []

  return {
    base: '/luci-static/clash-nivo/',
    plugins: [tailwindcss(), svelte(), ...serverPlugins],
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Only proxy to router when not using mock
      proxy: useMock ? {} : Object.fromEntries(
        proxyPrefixes.map((prefix) => [
          prefix,
          {
            target: routerTarget,
            changeOrigin: true,
            secure: false,
            ...(env.VITE_ROUTER_COOKIE ? {
              configure: (proxy: { on: (event: string, cb: (...args: unknown[]) => void) => void }) => {
                proxy.on('proxyReq', (proxyReq: { setHeader: (k: string, v: string) => void }) => {
                  proxyReq.setHeader('Cookie', env.VITE_ROUTER_COOKIE)
                })
              }
            } : {})
          }
        ])
      )
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 150
    }
  }
})

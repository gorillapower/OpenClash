import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { mockRpcPlugin } from './mock-rpc-plugin'

const proxyPrefixes = ['/cgi-bin', '/rpc', '/api']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const routerTarget = env.VITE_ROUTER_URL || 'http://192.168.1.1'
  const clashTarget = env.VITE_CLASH_URL || 'http://192.168.1.1:9090'
  const useMock = env.VITE_MOCK === 'true'

  const serverPlugins = useMock ? [mockRpcPlugin()] : []

  // Cookie injector for LuCI proxy routes
  const withCookie = env.VITE_ROUTER_COOKIE
    ? {
        configure: (proxy: { on: (event: string, cb: (...args: unknown[]) => void) => void }) => {
          proxy.on('proxyReq', (proxyReq: { setHeader: (k: string, v: string) => void }) => {
            proxyReq.setHeader('Cookie', env.VITE_ROUTER_COOKIE)
          })
        }
      }
    : {}

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
      proxy: useMock ? {} : {
        // LuCI routes — forward auth cookie
        ...Object.fromEntries(
          proxyPrefixes.map((prefix) => [prefix, { target: routerTarget, changeOrigin: true, secure: false, ...withCookie }])
        ),
        // Clash REST API — proxied to avoid CORS; goes directly to clash port
        '/clash-api': {
          target: clashTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/clash-api/, ''),
          ...(env.VITE_CLASH_SECRET ? {
            configure: (proxy: { on: (event: string, cb: (...args: unknown[]) => void) => void }) => {
              proxy.on('proxyReq', (proxyReq: { setHeader: (k: string, v: string) => void }) => {
                proxyReq.setHeader('Authorization', `Bearer ${env.VITE_CLASH_SECRET}`)
              })
            }
          } : {})
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 150
    }
  }
})

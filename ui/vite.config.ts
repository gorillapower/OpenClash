import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

const proxyPrefixes = ['/cgi-bin', '/rpc', '/api']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const routerTarget = env.VITE_ROUTER_URL || 'http://192.168.1.1'

  return {
    base: '/luci-static/clash-nivo/',
    plugins: [tailwindcss(), svelte()],
    resolve: {
      alias: {
        $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: Object.fromEntries(
        proxyPrefixes.map((prefix) => [
          prefix,
          {
            target: routerTarget,
            changeOrigin: true,
            secure: false
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

import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'
const f = p => fileURLToPath(new URL(p, import.meta.url))
const adminRoute = () => ({ name: 'admin-route', configureServer(s) { s.middlewares.use(rw) }, configurePreviewServer(s) { s.middlewares.use(rw) } })
const rw = (q, _, n) => { if (/^\/admin\/?(\?.*)?$/.test(q.url)) q.url = '/admin.html'; n() }
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [adminRoute()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', assetsInlineLimit: mode === 'single' ? 1e8 : 4096, rollupOptions: mode === 'single' ? {} : { input: { main: f('index.html'), gift: f('gift.html'), admin: f('admin.html') } } }
}))

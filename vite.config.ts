import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production-only Content-Security-Policy meta tag (static hosting cannot set headers).
// Everything is self-hosted: no third-party scripts, fonts, images or analytics.
const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // React inline style attributes
      "img-src 'self' data:",
      "media-src 'self'",
      "frame-src https://www.youtube-nocookie.com", // only the optional embedded song, and only after the Chaos gag fires
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
  },
})

// Social cards need an absolute image address. CI sets SITE_URL (for example https://<user>.github.io); without it the address stays relative.
const siteUrl = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', (process.env.SITE_URL ?? '').replace(/\/$/, '')),
})

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), siteUrl(), csp()],
})

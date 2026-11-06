import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const localApiRoutes = new Map([
  ['/api/schedules', () => import('./api/schedules.js')],
  ['/api/admin/login', () => import('./api/admin/login.js')],
  ['/api/admin/logout', () => import('./api/admin/logout.js')],
  ['/api/admin/session', () => import('./api/admin/session.js')],
])

function localApi() {
  return {
    name: 'local-serverless-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url || '/', 'http://localhost').pathname
        const loadRoute = localApiRoutes.get(path)
        if (!loadRoute) return next()

        try {
          if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body === undefined) {
            const chunks = []
            let size = 0
            for await (const chunk of req) {
              size += chunk.length
              if (size > 16_384) {
                res.statusCode = 413
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: 'Body permintaan terlalu besar.' }))
                return
              }
              chunks.push(chunk)
            }
            const rawBody = Buffer.concat(chunks).toString('utf8')
            try {
              req.body = rawBody ? JSON.parse(rawBody) : {}
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Format JSON tidak valid.' }))
              return
            }
          }
          const route = await loadRoute()
          await route.default(req, res)
        } catch (error) {
          console.error('Local API request failed.', error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Permintaan API gagal diproses.' }))
          }
        }
      })
    },
  }
}

const developmentHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' https://fpkjfgfrddttztdpbncb.supabase.co wss://fpkjfgfrddttztdpbncb.supabase.co*",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const previewHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [name, value] of Object.entries(env)) {
    if (process.env[name] === undefined) process.env[name] = value
  }
  return {
    plugins: [react(), localApi()],
    server: { headers: developmentHeaders },
    preview: { headers: previewHeaders },
  }
})

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { handleExportRequest } from './api/lib/sheetsExport.js'
import syncCuadrosHandler from './api/sync-cuadros.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.FOOTBALL_DATA_TOKEN || env.VITE_FOOTBALL_DATA_TOKEN

  return {
    plugins: [
      vue(),
      {
        name: 'api-dev-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/sync-cuadros') return next()
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }
            if (req.method !== 'GET' && req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const devEnv = loadEnv(mode, process.cwd(), '')
                for (const [k, v] of Object.entries(devEnv)) {
                  if (v != null && v !== '') process.env[k] = v
                }
                await syncCuadrosHandler(
                  {
                    method: req.method,
                    headers: { authorization: req.headers.authorization || '' },
                    body: body ? JSON.parse(body) : {},
                  },
                  {
                    status(code) {
                      res.statusCode = code
                      return {
                        json(obj) {
                          res.setHeader('Content-Type', 'application/json')
                          res.end(JSON.stringify(obj))
                        },
                      }
                    },
                  }
                )
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
      {
        name: 'api-export-sheets',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url !== '/api/export-sheets' || req.method !== 'POST') return next()
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const devEnv = loadEnv(mode, process.cwd(), '')
                const parsed = JSON.parse(body || '{}')
                const result = await handleExportRequest(parsed, devEnv)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(result))
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
    ],
    server: {
      proxy: {
        '/api/wc-matches': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: () => '/v4/competitions/WC/matches?season=2026',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) proxyReq.setHeader('X-Auth-Token', token)
            })
          },
        },
      },
    },
  }
})

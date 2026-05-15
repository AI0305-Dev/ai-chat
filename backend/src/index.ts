import 'dotenv/config'
import dns from 'dns'
dns.setServers(['8.8.8.8', '8.8.4.4'])
import { serve } from '@hono/node-server'
import { Hono, type MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import chat from './routes/chat.js'
import history from './routes/history.js'
import { getDb, initDb, closeDb } from './lib/mongodb.js'

const REQUIRED_ENV = ['GROQ_API_KEY', 'DATABASE_URL']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(JSON.stringify({ severity: 'CRITICAL', message: `Missing env vars: ${missing.join(', ')}` }))
  process.exit(1)
}

function log(severity: string, message: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ severity, message, time: new Date().toISOString(), ...extra }))
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(key)
  }
}, 5 * 60 * 1000).unref()

function rateLimit(maxRequests: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const now = Date.now()
    const entry = rateLimitStore.get(ip)
    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (entry.count >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429)
    }
    entry.count++
    return next()
  }
}

const app = new Hono()

app.use('*', secureHeaders())

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  log('INFO', 'request', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: Date.now() - start,
  })
})

app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'DELETE'],
  allowHeaders: ['Content-Type'],
}))

app.use('/api/chat',
  bodyLimit({ maxSize: 10 * 1024, onError: (c) => c.json({ error: 'Request body too large' }, 413) }),
  rateLimit(20, 60 * 1000),
)

app.get('/health', async (c) => {
  try {
    const db = await getDb()
    await db.command({ ping: 1 })
    return c.json({ status: 'ok' })
  } catch {
    return c.json({ status: 'error', message: 'Database unavailable' }, 503)
  }
})

app.route('/', chat)
app.route('/', history)

app.onError((err, c) => {
  log('ERROR', err.message, { stack: err.stack, path: c.req.path })
  const isDbError = err.name.includes('Mongo') || err.message.includes('connect')
  return c.json({ error: isDbError ? 'Database unavailable' : 'Internal server error' }, isDbError ? 503 : 500)
})

initDb().catch((err) => {
  log('WARNING', `Index initialization failed: ${err.message}`)
})

const server = serve({ fetch: app.fetch, port: 8080 }, (info) => {
  log('INFO', `Backend running on http://localhost:${info.port}`)
})

async function shutdown() {
  log('INFO', 'Shutting down gracefully...')
  server.close()
  await closeDb()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// backend/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers' // biarin sesuai install kamu
import { ENV } from './env'
import { authRoutes } from './routes/auth'
import { productRoutes } from './routes/products'
import { orderRoutes } from './routes/orders'
import { checkoutRoutes } from './routes/checkout'
import { webhookRoutes } from './routes/webhooks'

const app = new Hono()

// Security headers
app.use('*', secureHeaders())

// --- Request logger (untuk debug di terminal) ---
app.use('*', async (c, next) => {
  const t0 = Date.now()
  await next()
  const dt = Date.now() - t0
  const { method } = c.req
  const path = new URL(c.req.url).pathname
  console.log(`${method} ${path} -> ${c.res.status} ${dt}ms`)
})

// --- CORS: izinkan FE dev origins umum ---
const allowed = new Set<string>([
  ENV.APP_URL,         
  'https://minimart-frontend.vercel.app'
])

app.use('/api/*', cors({
  origin: (origin) => {
    // origin bisa null saat curl/postman — izinkan di dev
    if (!origin) return true
    return allowed.has(origin) ? origin : false
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}))

// sanity route
app.get('/', (c) => c.text('Hello from Hono!'))

// healthcheck
app.get('/health', (c) => c.json({ ok: true }))

// routes
app.route('/api/auth', authRoutes)
app.route('/api/products', productRoutes)
app.route('/api/orders', orderRoutes)
app.route('/api/checkout', checkoutRoutes)
app.route('/api/webhooks', webhookRoutes)
// app.post('/api/checkout/session', (c) => c.json({ ok: true, from: 'index.ts' }))

const PORT = Number(process.env.PORT || ENV.PORT || 3001)

export default {
  port: PORT,
  fetch: app.fetch,
  hostname: '0.0.0.0',
}

// log start (Bun cetak juga, tapi kita tambah info)
console.log(`[START] Listening on :${PORT} (hostname=0.0.0.0)`)
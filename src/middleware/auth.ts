// backend/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken' // lihat catatan ESM di bawah
import { ENV } from '../env'

// Middleware untuk verifikasi JWT
export const auth = createMiddleware(async (c, next) => {
  const header = c.req.header('authorization') // case-insensitive, aman pakai lowercase
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Middleware khusus admin
export const adminOnly = createMiddleware(async (c, next) => {
  const user = c.get('user') as any
  if (user?.role !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})

// 🔧 Alias agar impor lama `{ authMiddleware }` tetap jalan
export { auth as authMiddleware }

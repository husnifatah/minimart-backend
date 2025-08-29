// backend/src/routes/orders.ts
import { Hono } from 'hono'
import { prisma } from '../db'
import { auth } from '../middleware/auth'
import { ENV } from '../env'

export const orderRoutes = new Hono()

// Lindungi semua endpoint orders dengan auth
orderRoutes.use('*', auth)

/**
 * GET /api/orders
 * Ambil daftar pesanan milik user login, lengkap dengan items dan product.
 */
orderRoutes.get('/', async (c) => {
  const user = c.get('user') as { id: string }
  const data = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ data })
})

/**
 * GET /api/orders/:id
 * Ambil detail satu order milik user login.
 */
orderRoutes.get('/:id', async (c) => {
  const user = c.get('user') as { id: string }
  const id = c.req.param('id')

  const data = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: { include: { product: true } } },
  })
  if (!data) return c.json({ message: 'Order not found' }, 404)
  return c.json({ data })
})

/**
 * POST /api/orders/:id/sync
 * Tarik status terbaru dari Midtrans (Status API) dan update ke DB.
 * Memudahkan demo jika webhook belum terset.
 */
orderRoutes.post('/:id/sync', async (c) => {
  const user = c.get('user') as { id: string; role?: string }
  const id = c.req.param('id')

  // Pastikan order milik user ini
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
  })
  if (!order) return c.json({ message: 'Order not found' }, 404)

  try {
    const resp = await fetch(`https://api.sandbox.midtrans.com/v2/${id}/status`, {
      method: 'GET',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${ENV.MIDTRANS_SERVER_KEY}:`).toString('base64'),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })

    const data = await resp.json().catch(() => ({} as any))
    if (!resp.ok) {
      console.error('Midtrans status error', resp.status, data)
      return c.json({ message: 'Midtrans status error', detail: data }, 502)
    }

    const ts = (data as any).transaction_status as string
    const fraud = (data as any).fraud_status as string | undefined

    // Map status Midtrans -> status internal
    let newStatus: 'PENDING' | 'PAID' | 'CANCELLED' = 'PENDING'
    if (ts === 'settlement') newStatus = 'PAID'
    else if (ts === 'capture') newStatus = fraud === 'accept' ? 'PAID' : 'PENDING'
    else if (['deny', 'cancel', 'expire', 'failure', 'refund', 'partial_refund', 'chargeback', 'partial_chargeback'].includes(ts)) {
      newStatus = 'CANCELLED'
    }

    await prisma.order.update({ where: { id }, data: { status: newStatus } })
    return c.json({ data: { status: newStatus, midtrans: data } })
  } catch (e) {
    console.error('Sync status failed', e)
    return c.json({ message: 'Sync status failed' }, 500)
  }
})

/**
 * (Opsional) POST /api/orders/:id/settle
 * For demo: mark order sebagai PAID (batasi untuk ADMIN).
 */
orderRoutes.post('/:id/settle', async (c) => {
  const user = c.get('user') as { id: string; role?: string }
  if (user?.role !== 'ADMIN') return c.json({ message: 'Forbidden' }, 403)

  const id = c.req.param('id')
  await prisma.order.update({ where: { id }, data: { status: 'PAID' } })
  return c.json({ ok: true })
})

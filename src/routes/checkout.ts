// backend/src/routes/checkout.ts
import { Hono } from 'hono'
import { prisma } from '../db'
import { auth } from '../middleware/auth'
import { ENV } from '../env'
import { z } from 'zod'

const itemsSchema = z.array(z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  qty: z.number().int().positive(),
}))

function b64(s: string) {
  return Buffer.from(s).toString('base64')
}

export const checkoutRoutes = new Hono()

checkoutRoutes.post('/session', auth, async (c) => {
  try {
    const user = c.get('user') as { id: string; email: string }

    // 1) Ambil items dari body (dikirim FE)
    const body = await c.req.json().catch(() => ({}))
    const items = itemsSchema.parse(body.items)

    const total = items.reduce((sum, it) => sum + it.price * it.qty, 0)

    // 2) Buat order PENDING + items
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        total,
        status: 'PENDING',
        items: {
          create: items.map((it) => ({
            productId: it.id,
            qty: it.qty,
            price: it.price,
          })),
        },
      },
    })

    // 3) Request Snap token ke Midtrans (timeout 15s agar tidak menggantung lama)
    const payload = {
      transaction_details: { order_id: order.id, gross_amount: total },
      item_details: items.map((it) => ({
        id: it.id, price: it.price, quantity: it.qty, name: it.name,
      })),
      credit_card: { secure: true },
      customer_details: { email: user.email },
      callbacks: { finish: `${ENV.APP_URL}/orders` },
    }

    const resp = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + b64(`${ENV.MIDTRANS_SERVER_KEY}:`),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await resp.json().catch(() => ({} as any))
    if (!resp.ok) {
      console.error('Midtrans error', resp.status, data)
      return c.json({ message: 'Midtrans error', detail: data }, 502)
    }

    const snapToken = (data as any).token
    if (!snapToken) {
      console.error('Midtrans response tanpa token', data)
      return c.json({ message: 'Midtrans tidak mengembalikan token' }, 502)
    }

    return c.json({ data: { orderId: order.id, snapToken } })
  } catch (err) {
    console.error('Checkout error:', err)
    return c.json({ message: 'Checkout gagal', error: String(err) }, 500)
  }
})

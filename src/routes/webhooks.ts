import { Hono } from 'hono'
import { prisma } from '../db'
import { ENV } from '../env'
import crypto from 'crypto'

export const webhookRoutes = new Hono()

webhookRoutes.post('/midtrans', async (c) => {
  const body = await c.req.json()
  console.log('Midtrans webhook:', body)

  const { order_id, transaction_status, status_code, gross_amount, signature_key, fraud_status } = body

  // generate signature
  const expected = crypto.createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${ENV.MIDTRANS_SERVER_KEY}`)
    .digest('hex')

  if (!signature_key || signature_key.toLowerCase() !== expected.toLowerCase()) {
    console.warn('Invalid signature for order', order_id)
    return c.json({ ok: false, reason: 'invalid-signature' }, 200)
  }

  // map status midtrans ke status DB
  let newStatus: 'PENDING' | 'PAID' | 'CANCELLED' = 'PENDING'

  if (transaction_status === 'settlement') {
    newStatus = 'PAID'
  } else if (transaction_status === 'capture') {
    newStatus = fraud_status === 'accept' ? 'PAID' : 'PENDING'
  } else if (['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)) {
    newStatus = 'CANCELLED'
  }

  try {
    await prisma.order.update({
      where: { id: order_id },
      data: { status: newStatus }
    })
    console.log(`✅ Order ${order_id} updated to ${newStatus}`)
  } catch (e) {
    console.error('❌ Failed update order', e)
    return c.json({ ok: false }, 500)
  }

  return c.json({ ok: true })
})
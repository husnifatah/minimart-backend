import { Hono } from 'hono'
import { prisma } from '../db'
import { auth } from '../middleware/auth'
import { onlyAdmin } from '../middleware/onlyAdmin'

export const productRoutes = new Hono()

// Public: list & detail
productRoutes.get('/', async (c) => {
  const data = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return c.json({ data })
})

productRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const data = await prisma.product.findUnique({ where: { id } })
  if (!data) return c.json({ message: 'Not found' }, 404)
  return c.json({ data })
})

// Admin only: create, update, delete
productRoutes.post('/', auth, onlyAdmin, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { name, description, price, image } = body || {}
  if (!name || typeof price !== 'number') {
    return c.json({ message: 'name & price wajib' }, 400)
  }
  const data = await prisma.product.create({
    data: { name, description, price, image },
  })
  return c.json({ data }, 201)
})

productRoutes.put('/:id', auth, onlyAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const patch: any = {}
  if (typeof body.name === 'string') patch.name = body.name
  if (typeof body.description === 'string') patch.description = body.description
  if (typeof body.price === 'number') patch.price = body.price
  if (typeof body.image === 'string') patch.image = body.image

  try {
    const data = await prisma.product.update({ where: { id }, data: patch })
    return c.json({ data })
  } catch {
    return c.json({ message: 'Not found' }, 404)
  }
})

productRoutes.delete('/:id', auth, onlyAdmin, async (c) => {
  const id = c.req.param('id')
  try {
    await prisma.product.delete({ where: { id } })
    return c.json({ ok: true })
  } catch {
    return c.json({ message: 'Not found' }, 404)
  }
})

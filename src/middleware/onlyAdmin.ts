import { createMiddleware } from 'hono/factory'

export const onlyAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user') as { role?: string }
  if (user?.role !== 'ADMIN') {
    return c.json({ message: 'Forbidden' }, 403)
  }
  await next()
})

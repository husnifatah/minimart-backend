import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db';
import jwt from 'jsonwebtoken';
import { ENV } from '../env';
import { hashPassword } from '../lib/hash';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRoutes = new Hono()
  .post('/register', async (c) => {
    const body = await c.req.json();
    const parsed = credsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const { email, password } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return c.json({ error: 'Email already used' }, 400);

    const user = await prisma.user.create({
      data: { email, password: hashPassword(password) },
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });
    return c.json({ data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  })
  .post('/login', async (c) => {
    const body = await c.req.json();
    const parsed = credsSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== hashPassword(password)) return c.json({ error: 'Invalid credentials' }, 401);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });
    return c.json({ data: { token, user: { id: user.id, email: user.email, role: user.role } } });
  });
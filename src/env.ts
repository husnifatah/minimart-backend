import { z } from 'zod'

// Jangan pakai z.string().url() untuk postgres
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET required'),
  // support multi origin: pisahkan dengan koma
  APP_URL: z.string().min(1, 'APP_URL required'),
  PORT: z.coerce.number().optional(), // biar gak crash kalau kosong

  // optional supaya tidak crash saat start
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
})

export const ENV = EnvSchema.parse(process.env)

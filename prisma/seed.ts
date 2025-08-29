// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

async function main() {
  // 1) Admin default
  await prisma.user.upsert({
    where: { email: 'admin@minimart.local' },
    update: {},
    create: {
      email: 'admin@minimart.local',
      password: hash('admin123'), // ganti di produksi
      role: 'ADMIN',
    },
  });

  // 2) Produk sample: gunakan ID stabil supaya aman di-upsert
  const products = [
    {
      id: 'prod_kaos_minimart',
      name: 'Kaos MiniMart',
      price: 120000,
      image: 'https://picsum.photos/seed/kaos/600/400',
      description: 'Kaos katun nyaman.',
    },
    {
      id: 'prod_mug_minimart',
      name: 'Mug MiniMart',
      price: 80000,
      image: 'https://picsum.photos/seed/mug/600/400',
      description: 'Mug keramik favorit.',
    },
    {
      id: 'prod_stiker_pack',
      name: 'Stiker Pack',
      price: 25000,
      image: 'https://picsum.photos/seed/stiker/600/400',
      description: 'Stiker lucu-lucu.',
    },
  ] as const;

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },         // ✅ kolom unik by default
      update: {
        name: p.name,
        price: p.price,
        image: p.image,
        description: p.description ?? null,
      },
      create: {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        description: p.description ?? null,
      },
    });
  }

  console.log('Seed done. Admin: admin@minimart.local / pass: admin123');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

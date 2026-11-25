import { PrismaClient, RoleName } from '../generated/index.js';
import argon2 from 'argon2';

const prisma = new PrismaClient();

try {
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12)
      throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: RoleName.ADMIN },
    });
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        displayName: process.env.ADMIN_DISPLAY_NAME?.trim() || 'Administrator',
        passwordHash,
        emailVerified: true,
        userRoles: { create: { roleId: role.id } },
      },
      update: {
        passwordHash,
        emailVerified: true,
        userRoles: { connect: { roleId: role.id } },
      },
    });
  }
} finally {
  await prisma.$disconnect();
}

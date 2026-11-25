import { BadRequestException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';

describe('Catalog AppService', () => {
  it('applies bounded pagination and excludes products in deleted categories', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      product: { findMany, count },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    } as unknown as PrismaService;
    const service = new AppService(prisma);

    await service.listProducts({ page: 2, pageSize: 5, search: 'pizza' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          isDeleted: false,
          OR: [
            { categoryId: null },
            { category: { is: { isDeleted: false } } },
          ],
          name: { contains: 'pizza', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('rejects a product assigned to a deleted or missing category', async () => {
    const prisma = {
      category: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new AppService(prisma);

    await expect(
      service.createProduct({
        sku: 'P-1',
        name: 'Pizza',
        priceMinor: 1000,
        categoryId: 'deleted-id',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

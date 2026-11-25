import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/index.js';
import { PrismaService } from './prisma.service.js';
import type {
  CreateCategoryDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto.js';

const productDetails = { category: true } satisfies Prisma.ProductInclude;

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): { service: string; status: string } {
    return { service: 'catalog-service', status: 'ok' };
  }

  async listCategories() {
    return this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
    });
  }

  async listProducts(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ProductWhereInput = {
      isDeleted: false,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      OR: [{ categoryId: null }, { category: { is: { isDeleted: false } } }],
      ...(query.isAvailable !== undefined
        ? { isAvailable: query.isAvailable === 'true' }
        : {}),
      ...(query.search
        ? { name: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productDetails,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async getProduct(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isDeleted: false },
      include: productDetails,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createCategory(input: CreateCategoryDto) {
    const slug = slugify(input.name, 140);
    if (!slug)
      throw new BadRequestException(
        'Category name cannot produce a valid slug',
      );
    try {
      return await this.prisma.category.create({
        data: {
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
        },
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async updateCategory(id: string, input: UpdateCategoryDto) {
    const data: Prisma.CategoryUpdateInput = {
      ...(input.name !== undefined
        ? { name: input.name.trim(), slug: slugify(input.name, 140) }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
    };
    if (input.name !== undefined && !slugify(input.name, 140)) {
      throw new BadRequestException(
        'Category name cannot produce a valid slug',
      );
    }
    if (Object.keys(data).length === 0)
      throw new BadRequestException('No category fields were provided');
    try {
      return await this.prisma.category.update({
        where: { id, isDeleted: false },
        data,
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const result = await this.prisma.category.updateMany({
      where: { id, isDeleted: false },
      data: { isDeleted: true },
    });
    if (result.count !== 1) throw new NotFoundException('Category not found');
  }

  async createProduct(input: CreateProductDto) {
    const slug = slugify(input.name);
    if (!slug)
      throw new BadRequestException('Product name cannot produce a valid slug');
    await this.assertActiveCategory(input.categoryId);
    try {
      return await this.prisma.product.create({
        data: {
          sku: input.sku.trim().toUpperCase(),
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          priceMinor: input.priceMinor,
          currency: input.currency?.toUpperCase() ?? 'BRL',
          imageUrl: input.imageUrl ?? null,
          isAvailable: input.isAvailable ?? true,
          categoryId: input.categoryId ?? null,
        },
        include: productDetails,
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async updateProduct(id: string, input: UpdateProductDto) {
    if (input.name !== undefined && !slugify(input.name)) {
      throw new BadRequestException('Product name cannot produce a valid slug');
    }
    if (input.categoryId !== undefined)
      await this.assertActiveCategory(input.categoryId);
    const data: Prisma.ProductUpdateInput = {
      ...(input.sku !== undefined
        ? { sku: input.sku.trim().toUpperCase() }
        : {}),
      ...(input.name !== undefined
        ? { name: input.name.trim(), slug: slugify(input.name) }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
      ...(input.priceMinor !== undefined
        ? { priceMinor: input.priceMinor }
        : {}),
      ...(input.currency !== undefined
        ? { currency: input.currency.toUpperCase() }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.isAvailable !== undefined
        ? { isAvailable: input.isAvailable }
        : {}),
      ...(input.categoryId !== undefined
        ? {
            category: input.categoryId
              ? { connect: { id: input.categoryId } }
              : { disconnect: true },
          }
        : {}),
    };
    if (Object.keys(data).length === 0)
      throw new BadRequestException('No product fields were provided');
    try {
      return await this.prisma.product.update({
        where: { id, isDeleted: false },
        data,
        include: productDetails,
      });
    } catch (error) {
      this.mapWriteError(error);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const result = await this.prisma.product.updateMany({
      where: { id, isDeleted: false },
      data: { isDeleted: true, isAvailable: false },
    });
    if (result.count !== 1) throw new NotFoundException('Product not found');
  }

  private mapWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException(
          'A category, SKU, or product slug already exists',
        );
      if (error.code === 'P2025')
        throw new NotFoundException('Catalog record not found');
      if (error.code === 'P2003')
        throw new BadRequestException('The selected category does not exist');
    }
    throw error;
  }

  private async assertActiveCategory(
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (!categoryId) return;
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isDeleted: false },
      select: { id: true },
    });
    if (!category)
      throw new BadRequestException('The selected category does not exist');
  }
}

function slugify(value: string, maxLength = 200): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

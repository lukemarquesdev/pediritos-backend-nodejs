import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service.js';
import {
  CreateCategoryDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto.js';
import { AdminGuard } from './admin.guard.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { service: string; status: string } {
    return this.appService.getHello();
  }

  @Get('v1/catalog/categories')
  listCategories() {
    return this.appService.listCategories();
  }

  @Get('v1/catalog/products')
  listProducts(@Query() query: ProductQueryDto) {
    return this.appService.listProducts(query);
  }

  @Get('v1/catalog/products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.appService.getProduct(slug);
  }

  @Post('v1/admin/catalog/categories')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() input: CreateCategoryDto) {
    return this.appService.createCategory(input);
  }

  @Patch('v1/admin/catalog/categories/:id')
  @UseGuards(AdminGuard)
  updateCategory(@Param('id') id: string, @Body() input: UpdateCategoryDto) {
    return this.appService.updateCategory(id, input);
  }

  @Delete('v1/admin/catalog/categories/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.appService.deleteCategory(id);
  }

  @Post('v1/admin/catalog/products')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createProduct(@Body() input: CreateProductDto) {
    return this.appService.createProduct(input);
  }

  @Patch('v1/admin/catalog/products/:id')
  @UseGuards(AdminGuard)
  updateProduct(@Param('id') id: string, @Body() input: UpdateProductDto) {
    return this.appService.updateProduct(id, input);
  }

  @Delete('v1/admin/catalog/products/:id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string): Promise<void> {
    await this.appService.deleteProduct(id);
  }
}

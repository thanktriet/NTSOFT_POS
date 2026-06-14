import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // ===== Categories =====

  async getCategories(storeId: string) {
    return this.prisma.menuCategory.findMany({
      where: { storeId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  async createCategory(data: { storeId: string; name: string; icon?: string }) {
    return this.prisma.menuCategory.create({ data });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.menuCategory.update({ where: { id }, data });
  }

  // ===== Items =====

  async getItems(categoryId: string) {
    return this.prisma.menuItem.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getItemById(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createItem(data: {
    categoryId: string;
    name: string;
    price: number;
    description?: string;
    image?: string;
    prepTime?: number;
  }) {
    return this.prisma.menuItem.create({ data });
  }

  async updateItem(id: string, data: {
    name?: string;
    price?: number;
    description?: string;
    image?: string;
    prepTime?: number;
    isAvailable?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.menuItem.update({ where: { id }, data });
  }

  async toggleAvailability(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  // ===== Options =====

  async createOption(data: {
    menuItemId: string;
    groupName: string;
    name: string;
    price?: number;
    isRequired?: boolean;
  }) {
    return this.prisma.menuOption.create({ data });
  }

  async deleteOption(id: string) {
    return this.prisma.menuOption.delete({ where: { id } });
  }

  // ===== Full menu for customer =====

  async getFullMenu(storeId: string) {
    return this.prisma.menuCategory.findMany({
      where: { storeId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }
}

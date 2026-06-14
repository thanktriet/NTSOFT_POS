import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.store.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.store.findMany();
  }

  async create(data: { name: string; address?: string; phone?: string }) {
    return this.prisma.store.create({ data });
  }

  async update(id: string, data: { name?: string; address?: string; phone?: string }) {
    return this.prisma.store.update({ where: { id }, data });
  }

  async updateSettings(id: string, settings: Record<string, any>) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    const currentSettings = (store?.settings as Record<string, any>) || {};
    const merged = { ...currentSettings, ...settings };
    return this.prisma.store.update({
      where: { id },
      data: { settings: merged },
    });
  }

  async getSettings(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    return (store?.settings as Record<string, any>) || {};
  }
}

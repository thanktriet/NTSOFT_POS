import { Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  async findByStore(storeId: string) {
    return this.prisma.table.findMany({
      where: { storeId },
      orderBy: [{ floor: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async create(data: {
    storeId: string;
    name: string;
    floor?: string;
    seats?: number;
  }) {
    const qrCode = `${data.storeId}/${data.name}`.toLowerCase().replace(/\s/g, '-');
    return this.prisma.table.create({
      data: { ...data, qrCode },
    });
  }

  async updateStatus(id: string, status: TableStatus) {
    return this.prisma.table.update({
      where: { id },
      data: { status },
    });
  }

  async findByQrCode(qrCode: string) {
    const table = await this.prisma.table.findUnique({ where: { qrCode } });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }
}

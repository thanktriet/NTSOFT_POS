import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderItemStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class KitchenService {
  constructor(private prisma: PrismaService) {}

  // Get all items for KDS grouped by status (FIFO order)
  async getKitchenQueue(storeId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { storeId },
        status: { in: [OrderItemStatus.pending, OrderItemStatus.cooking, OrderItemStatus.ready] },
      },
      include: {
        menuItem: true,
        order: { include: { table: true, staff: { select: { name: true } } } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' }, // FIFO
    });

    return {
      pending: items.filter((i) => i.status === OrderItemStatus.pending),
      cooking: items.filter((i) => i.status === OrderItemStatus.cooking),
      ready: items.filter((i) => i.status === OrderItemStatus.ready),
    };
  }

  // Get recently completed items
  async getCompletedItems(storeId: string, limit = 20) {
    return this.prisma.orderItem.findMany({
      where: {
        order: { storeId },
        status: OrderItemStatus.served,
      },
      include: {
        menuItem: true,
        order: { include: { table: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
  }

  // Start cooking an item
  async startCooking(itemId: string, chefId?: string) {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.cooking,
        assignedToId: chefId,
        startedAt: new Date(),
      },
      include: { menuItem: true, order: { include: { table: true } } },
    });
  }

  // Mark item as ready
  async markReady(itemId: string) {
    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.ready,
        completedAt: new Date(),
      },
      include: { menuItem: true, order: { include: { table: true } } },
    });
  }

  // Mark item as served
  async markServed(itemId: string) {
    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.served,
        servedAt: new Date(),
      },
      include: { menuItem: true, order: { include: { table: true } } },
    });
  }

  // Kitchen stats
  async getStats(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, completed, pending, cooking] = await Promise.all([
      this.prisma.orderItem.count({
        where: { order: { storeId }, createdAt: { gte: today } },
      }),
      this.prisma.orderItem.count({
        where: { order: { storeId }, status: OrderItemStatus.served, createdAt: { gte: today } },
      }),
      this.prisma.orderItem.count({
        where: { order: { storeId }, status: OrderItemStatus.pending },
      }),
      this.prisma.orderItem.count({
        where: { order: { storeId }, status: OrderItemStatus.cooking },
      }),
    ]);

    // Average cooking time (completed items today)
    const completedItems = await this.prisma.orderItem.findMany({
      where: {
        order: { storeId },
        status: OrderItemStatus.served,
        startedAt: { not: null },
        completedAt: { not: null },
        createdAt: { gte: today },
      },
      select: { startedAt: true, completedAt: true },
    });

    let avgTime = 0;
    if (completedItems.length > 0) {
      const totalMs = completedItems.reduce((sum, item) => {
        return sum + (item.completedAt!.getTime() - item.startedAt!.getTime());
      }, 0);
      avgTime = Math.round(totalMs / completedItems.length / 60000); // minutes
    }

    return { total, completed, pending, cooking, avgTime };
  }
}

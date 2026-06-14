import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, OrderItemStatus, OrderSource, TableStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // ===== Create Order =====

  async createOrder(data: {
    storeId: string;
    tableId: string;
    staffId?: string;
    source: OrderSource;
    items: Array<{
      menuItemId: string;
      quantity: number;
      note?: string;
      options?: any[];
    }>;
    note?: string;
  }) {
    // Generate order number (auto-increment per store per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderCount = await this.prisma.order.count({
      where: { storeId: data.storeId, createdAt: { gte: today } },
    });
    const orderNumber = orderCount + 1;

    // Calculate prices
    let subtotal = 0;
    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        const menuItem = await this.prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!menuItem) throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
        if (!menuItem.isAvailable) throw new BadRequestException(`${menuItem.name} hiện không có sẵn`);

        const optionsPrice = (item.options || []).reduce(
          (sum: number, opt: any) => sum + (opt.price || 0),
          0,
        );
        const unitPrice = menuItem.price + optionsPrice;
        subtotal += unitPrice * item.quantity;

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice,
          note: item.note,
          options: item.options || [],
          status: OrderItemStatus.pending,
        };
      }),
    );

    // Create order with items
    const order = await this.prisma.order.create({
      data: {
        storeId: data.storeId,
        tableId: data.tableId,
        staffId: data.staffId,
        orderNumber,
        source: data.source,
        subtotal,
        total: subtotal, // discount applied later
        note: data.note,
        status: OrderStatus.pending,
        items: { create: itemsData },
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    // Update table status
    await this.prisma.table.update({
      where: { id: data.tableId },
      data: { status: TableStatus.occupied },
    });

    return order;
  }

  // ===== Get Orders =====

  async findByStore(storeId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: { storeId, ...(status && { status }) },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTable(tableId: string) {
    return this.prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: [OrderStatus.paid, OrderStatus.cancelled] },
      },
      include: { items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true, assignedTo: { select: { id: true, name: true } } } },
        table: true,
        staff: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ===== Update Order Status =====

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { menuItem: true } }, table: true },
    });
  }

  // ===== Add Items to Existing Order =====

  async addItems(
    orderId: string,
    items: Array<{ menuItemId: string; quantity: number; note?: string; options?: any[] }>,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    let additionalTotal = 0;
    const itemsData = await Promise.all(
      items.map(async (item) => {
        const menuItem = await this.prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!menuItem) throw new NotFoundException(`Menu item not found`);

        const optionsPrice = (item.options || []).reduce(
          (sum: number, opt: any) => sum + (opt.price || 0),
          0,
        );
        const unitPrice = menuItem.price + optionsPrice;
        additionalTotal += unitPrice * item.quantity;

        return {
          orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice,
          note: item.note,
          options: item.options || [],
          status: OrderItemStatus.pending,
        };
      }),
    );

    // Create items and update order total
    await this.prisma.orderItem.createMany({ data: itemsData });
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal: order.subtotal + additionalTotal,
        total: order.total + additionalTotal,
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    return updatedOrder;
  }

  // ===== Get active orders for a store (dashboard) =====

  async getActiveOrders(storeId: string) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        status: { notIn: [OrderStatus.paid, OrderStatus.cancelled] },
      },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

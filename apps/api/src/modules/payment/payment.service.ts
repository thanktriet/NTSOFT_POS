import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, TableStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // Process payment
  async processPayment(orderId: string, data: {
    method: PaymentMethod;
    discount?: number;
    received?: number; // cash received
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.paid) {
      throw new BadRequestException('Order already paid');
    }

    const discount = data.discount || 0;
    const total = order.subtotal - discount;

    // Update order
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.paid,
        paymentMethod: data.method,
        discount,
        total,
        paidAt: new Date(),
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    // Check if all orders on this table are paid → set table to empty
    const unpaidOrders = await this.prisma.order.count({
      where: {
        tableId: order.tableId,
        status: { notIn: [OrderStatus.paid, OrderStatus.cancelled] },
      },
    });

    if (unpaidOrders === 0) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.empty },
      });
    }

    return {
      order: updatedOrder,
      payment: {
        subtotal: order.subtotal,
        discount,
        total,
        method: data.method,
        received: data.received,
        change: data.received ? data.received - total : 0,
      },
    };
  }

  // Request payment (from customer)
  async requestPayment(tableId: string) {
    await this.prisma.table.update({
      where: { id: tableId },
      data: { status: TableStatus.paying },
    });

    // Get bill summary
    const orders = await this.prisma.order.findMany({
      where: {
        tableId,
        status: { notIn: [OrderStatus.paid, OrderStatus.cancelled] },
      },
      include: { items: { include: { menuItem: true } } },
    });

    const total = orders.reduce((sum, o) => sum + o.total, 0);
    return { tableId, orders, total };
  }

  // Generate VietQR payment info
  async generateQrPayment(amount: number, tableLabel: string, storeId?: string) {
    // Get config from store settings
    let bankCode = 'VCB';
    let accountNumber = '1234567890';
    let accountName = 'NTSOFT POS';
    let template = 'compact';

    if (storeId) {
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      if (store?.settings && typeof store.settings === 'object') {
        const settings = store.settings as any;
        if (settings.vietqr) {
          bankCode = settings.vietqr.bankCode || bankCode;
          accountNumber = settings.vietqr.accountNumber || accountNumber;
          accountName = settings.vietqr.accountName || accountName;
          template = settings.vietqr.template || template;
        }
      }
    }

    const content = `${tableLabel} ${amount}`.replace(/\./g, '');
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      bankCode,
      accountNumber,
      accountName,
      amount,
      content,
      qrUrl,
    };
  }

  // Get daily revenue
  async getDailyRevenue(storeId: string, date?: Date) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: OrderStatus.paid,
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;
    const avgPerOrder = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

    return { revenue, orderCount, avgPerOrder, date: targetDate };
  }
}

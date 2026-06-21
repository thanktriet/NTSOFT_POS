import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  // Revenue by date range
  async getRevenue(storeId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: OrderStatus.paid,
        paidAt: { gte: startDate, lte: endDate },
      },
      select: { total: true, paidAt: true, paymentMethod: true },
      orderBy: { paidAt: 'asc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;
    const avgPerOrder = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

    // Group by payment method
    const byMethod: Record<string, { count: number; total: number }> = {};
    orders.forEach((o) => {
      const method = o.paymentMethod || 'unknown';
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count++;
      byMethod[method].total += o.total;
    });

    return { totalRevenue, orderCount, avgPerOrder, byMethod };
  }

  // Revenue by day (for chart)
  async getRevenueByDay(storeId: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: OrderStatus.paid,
        paidAt: { gte: startDate, lte: endDate },
      },
      select: { total: true, paidAt: true },
    });

    // Group by date
    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      if (o.paidAt) {
        const key = o.paidAt.toISOString().split('T')[0];
        if (dailyMap[key]) {
          dailyMap[key].revenue += o.total;
          dailyMap[key].orders++;
        }
      }
    });

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  // Revenue by hour (for today chart)
  async getRevenueByHour(storeId: string, date?: Date) {
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
      select: { total: true, paidAt: true },
    });

    const hourlyMap: Record<number, { revenue: number; orders: number }> = {};
    for (let h = 6; h <= 23; h++) {
      hourlyMap[h] = { revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      if (o.paidAt) {
        const hour = o.paidAt.getHours();
        if (hourlyMap[hour]) {
          hourlyMap[hour].revenue += o.total;
          hourlyMap[hour].orders++;
        }
      }
    });

    return Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }));
  }

  // Top selling items
  async getTopItems(storeId: string, startDate: Date, endDate: Date, limit = 10) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          storeId,
          status: OrderStatus.paid,
          paidAt: { gte: startDate, lte: endDate },
        },
      },
      include: { menuItem: { select: { name: true, price: true } } },
    });

    // Aggregate
    const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
    items.forEach((i) => {
      const key = i.menuItemId;
      if (!itemMap[key]) {
        itemMap[key] = { name: i.menuItem.name, count: 0, revenue: 0 };
      }
      itemMap[key].count += i.quantity;
      itemMap[key].revenue += i.unitPrice * i.quantity;
    });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // Staff performance
  async getStaffPerformance(storeId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: OrderStatus.paid,
        paidAt: { gte: startDate, lte: endDate },
        staffId: { not: null },
      },
      include: { staff: { select: { id: true, name: true } } },
    });

    const staffMap: Record<string, { name: string; orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      if (o.staff) {
        if (!staffMap[o.staff.id]) {
          staffMap[o.staff.id] = { name: o.staff.name, orders: 0, revenue: 0 };
        }
        staffMap[o.staff.id].orders++;
        staffMap[o.staff.id].revenue += o.total;
      }
    });

    return Object.values(staffMap).sort((a, b) => b.revenue - a.revenue);
  }

  // Summary dashboard
  async getDashboardSummary(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const endYesterday = new Date(yesterday);
    endYesterday.setHours(23, 59, 59, 999);

    const [todayData, yesterdayData, hourlyData, topItems] = await Promise.all([
      this.getRevenue(storeId, today, endToday),
      this.getRevenue(storeId, yesterday, endYesterday),
      this.getRevenueByHour(storeId),
      this.getTopItems(storeId, today, endToday, 5),
    ]);

    const revenueChange = yesterdayData.totalRevenue > 0
      ? Math.round(((todayData.totalRevenue - yesterdayData.totalRevenue) / yesterdayData.totalRevenue) * 100)
      : 0;

    return {
      today: todayData,
      yesterday: yesterdayData,
      revenueChange,
      hourly: hourlyData,
      topItems,
    };
  }
}

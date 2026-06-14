import { Injectable } from '@nestjs/common';
import { NotificationType, StaffRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    storeId: string;
    type: NotificationType;
    title: string;
    body?: string;
    data?: any;
    targetRole?: StaffRole;
  }) {
    return this.prisma.notification.create({
      data: {
        storeId: data.storeId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        targetRole: data.targetRole,
      },
    });
  }

  async findByStore(storeId: string, role?: StaffRole, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        storeId,
        ...(role && { OR: [{ targetRole: role }, { targetRole: null }] }),
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(storeId: string, role?: StaffRole) {
    return this.prisma.notification.updateMany({
      where: {
        storeId,
        isRead: false,
        ...(role && { OR: [{ targetRole: role }, { targetRole: null }] }),
      },
      data: { isRead: true },
    });
  }
}

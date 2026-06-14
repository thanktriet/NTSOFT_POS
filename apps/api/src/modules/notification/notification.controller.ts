import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StaffRole } from '@prisma/client';
import { NotificationService } from './notification.service';

@ApiTags('Notification')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get(':storeId')
  @ApiOperation({ summary: 'Get notifications' })
  findByStore(
    @Param('storeId') storeId: string,
    @Query('role') role?: StaffRole,
    @Query('unread') unread?: string,
  ) {
    return this.notificationService.findByStore(storeId, role, unread === 'true');
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Put(':storeId/read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  markAllAsRead(@Param('storeId') storeId: string, @Query('role') role?: StaffRole) {
    return this.notificationService.markAllAsRead(storeId, role);
  }
}

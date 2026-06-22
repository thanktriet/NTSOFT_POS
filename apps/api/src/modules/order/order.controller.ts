import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrderStatus, OrderSource } from '@prisma/client';
import { OrderService } from './order.service';

@ApiTags('Order')
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order (QR or Staff)' })
  create(
    @Body()
    data: {
      storeId: string;
      tableId: string;
      staffId?: string;
      source?: OrderSource;
      items: Array<{ menuItemId: string; quantity: number; note?: string; options?: any[] }>;
      note?: string;
    },
  ) {
    return this.orderService.createOrder({
      ...data,
      source: data.source || OrderSource.qr,
    });
  }

  @Get('store/:storeId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders by store' })
  findByStore(
    @Param('storeId') storeId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.findByStore(storeId, status);
  }

  @Get('store/:storeId/active')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active orders for dashboard' })
  getActiveOrders(@Param('storeId') storeId: string) {
    return this.orderService.getActiveOrders(storeId);
  }

  @Get('table/:tableId')
  @ApiOperation({ summary: 'Get orders by table (for customer tracking)' })
  findByTable(@Param('tableId') tableId: string) {
    return this.orderService.findByTable(tableId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id') id: string, @Body() data: { status: OrderStatus }) {
    return this.orderService.updateStatus(id, data.status);
  }

  @Put(':id/transfer')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer order to another table' })
  transferTable(@Param('id') id: string, @Body() data: { newTableId: string }) {
    return this.orderService.transferTable(id, data.newTableId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to existing order' })
  addItems(
    @Param('id') id: string,
    @Body() data: { items: Array<{ menuItemId: string; quantity: number; note?: string; options?: any[] }> },
  ) {
    return this.orderService.addItems(id, data.items);
  }
}

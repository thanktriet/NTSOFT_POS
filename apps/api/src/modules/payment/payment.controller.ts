import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentMethod } from '@prisma/client';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('process/:orderId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payment for order' })
  processPayment(
    @Param('orderId') orderId: string,
    @Body() data: { method: PaymentMethod; discount?: number; received?: number },
  ) {
    return this.paymentService.processPayment(orderId, data);
  }

  @Post('request/:tableId')
  @ApiOperation({ summary: 'Customer requests payment' })
  requestPayment(@Param('tableId') tableId: string) {
    return this.paymentService.requestPayment(tableId);
  }

  @Get('qr')
  @ApiOperation({ summary: 'Generate QR payment info' })
  generateQr(@Query('amount') amount: number, @Query('table') table: string, @Query('storeId') storeId?: string) {
    return this.paymentService.generateQrPayment(amount, table, storeId);
  }

  @Get('revenue/:storeId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily revenue' })
  getDailyRevenue(@Param('storeId') storeId: string) {
    return this.paymentService.getDailyRevenue(storeId);
  }
}

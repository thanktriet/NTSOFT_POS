import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrintService, PrinterConfig } from './print.service';

@ApiTags('Print')
@Controller('print')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PrintController {
  constructor(private printService: PrintService) {}

  @Post('receipt/:orderId')
  @ApiOperation({ summary: 'Print receipt via IP LAN' })
  async printReceipt(
    @Param('orderId') orderId: string,
    @Body() config: { ip: string; port?: number },
  ) {
    const data = await this.printService.generateReceipt(orderId);
    const success = await this.printService.printViaIp(
      data,
      config.ip,
      config.port || 9100,
    );
    return { success, message: success ? 'In bill thành công' : 'Không thể kết nối máy in' };
  }

  @Post('kitchen-ticket/:orderId')
  @ApiOperation({ summary: 'Print kitchen ticket via IP LAN' })
  async printKitchenTicket(
    @Param('orderId') orderId: string,
    @Body() config: { ip: string; port?: number },
  ) {
    const data = await this.printService.generateKitchenTicket(orderId);
    const success = await this.printService.printViaIp(
      data,
      config.ip,
      config.port || 9100,
    );
    return { success, message: success ? 'In phiếu bếp thành công' : 'Không thể kết nối máy in' };
  }

  @Get('receipt/:orderId/text')
  @ApiOperation({ summary: 'Get receipt as text (for Bluetooth / preview)' })
  async getReceiptText(@Param('orderId') orderId: string) {
    const text = await this.printService.getReceiptText(orderId);
    return { text };
  }

  @Get('receipt/:orderId/data')
  @ApiOperation({ summary: 'Get receipt as binary base64 (for Bluetooth)' })
  async getReceiptData(@Param('orderId') orderId: string) {
    const buffer = await this.printService.generateReceipt(orderId);
    return { data: buffer.toString('base64') };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test printer connection' })
  async testPrinter(@Body() config: { ip: string; port?: number }) {
    const { EscPosBuilder } = await import('./escpos.builder');
    const builder = new EscPosBuilder();
    const testData = builder
      .init()
      .align('center')
      .bold(true)
      .text('=== TEST PRINT ===')
      .bold(false)
      .text('NTSOFT POS')
      .text('Ket noi may in thanh cong!')
      .text(new Date().toLocaleString('vi-VN'))
      .feed(3)
      .cut()
      .build();

    const success = await this.printService.printViaIp(
      testData,
      config.ip,
      config.port || 9100,
    );
    return { success, message: success ? 'Máy in hoạt động tốt' : 'Không thể kết nối' };
  }

  @Post('open-drawer')
  @ApiOperation({ summary: 'Open cash drawer via printer' })
  async openDrawer(@Body() config: { ip: string; port?: number; pin?: 1 | 2 }) {
    const { EscPosBuilder } = await import('./escpos.builder');
    const builder = new EscPosBuilder();
    const data = builder.init().openDrawer(config.pin || 1).build();

    const success = await this.printService.printViaIp(
      data,
      config.ip,
      config.port || 9100,
    );
    return { success, message: success ? 'Đã mở ngăn kéo' : 'Không thể kết nối máy in' };
  }

  @Post('receipt-and-drawer/:orderId')
  @ApiOperation({ summary: 'Print receipt + open drawer (for cash payment)' })
  async printReceiptAndOpenDrawer(
    @Param('orderId') orderId: string,
    @Body() config: { ip: string; port?: number },
  ) {
    const { EscPosBuilder } = await import('./escpos.builder');

    // Generate receipt
    const receiptData = await this.printService.generateReceipt(orderId);

    // Open drawer command
    const drawerCmd = new EscPosBuilder().openDrawer(1).build();

    // Combine: receipt + cut + open drawer
    const combined = Buffer.concat([receiptData, drawerCmd]);

    const success = await this.printService.printViaIp(
      combined,
      config.ip,
      config.port || 9100,
    );
    return { success, message: success ? 'In bill + mở ngăn kéo thành công' : 'Không thể kết nối' };
  }
}

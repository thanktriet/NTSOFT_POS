import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EscPosBuilder } from './escpos.builder';

export interface PrinterConfig {
  type: 'ip' | 'bluetooth';
  ip?: string;
  port?: number; // default 9100
  macAddress?: string; // for bluetooth
  paperWidth?: 58 | 80; // mm
}

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);

  constructor(private prisma: PrismaService) {}

  // ===== Print bill via IP LAN =====
  async printViaIp(data: Buffer, ip: string, port = 9100): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        this.logger.error(`Print timeout: ${ip}:${port}`);
        resolve(false);
      }, 5000);

      client.connect(port, ip, () => {
        client.write(data, () => {
          clearTimeout(timeout);
          client.end();
          this.logger.log(`Print success: ${ip}:${port}`);
          resolve(true);
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        this.logger.error(`Print error: ${ip}:${port} - ${err.message}`);
        client.destroy();
        resolve(false);
      });
    });
  }

  // ===== Generate receipt data (ESC/POS commands) =====
  async generateReceipt(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { name: true } },
        store: true,
      },
    });

    if (!order) throw new Error('Order not found');

    const builder = new EscPosBuilder();
    const now = new Date();

    return builder
      // Header
      .init()
      .align('center')
      .bold(true)
      .textSize(2, 2)
      .text(order.store.name)
      .textSize(1, 1)
      .bold(false)
      .text(order.store.address || '')
      .text(order.store.phone ? `ĐT: ${order.store.phone}` : '')
      .feed(1)

      // Order info
      .align('center')
      .bold(true)
      .textSize(2, 1)
      .text('HÓA ĐƠN THANH TOÁN')
      .textSize(1, 1)
      .bold(false)
      .feed(1)
      .align('left')
      .text(`Bàn: ${order.table.name}`)
      .text(`Số HĐ: #${order.orderNumber}`)
      .text(`Ngày: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`)
      .text(order.staff ? `NV: ${order.staff.name}` : 'Khách tự order (QR)')
      .separator()

      // Items
      .bold(true)
      .columns('Món', 'SL', 'Giá', 'T.Tiền')
      .bold(false)
      .separator('-')
      .items(
        order.items.map((item) => ({
          name: item.menuItem.name,
          qty: item.quantity,
          price: item.unitPrice,
          total: item.unitPrice * item.quantity,
          note: item.note,
        })),
      )
      .separator()

      // Totals
      .align('right')
      .text(`Tạm tính: ${this.formatVND(order.subtotal)}`)
      .text(order.discount > 0 ? `Giảm giá: -${this.formatVND(order.discount)}` : '')
      .bold(true)
      .textSize(1, 2)
      .text(`TỔNG: ${this.formatVND(order.total)}`)
      .textSize(1, 1)
      .bold(false)
      .feed(1)

      // Payment info
      .align('left')
      .text(`Thanh toán: ${this.paymentLabel(order.paymentMethod)}`)
      .separator()

      // Footer
      .align('center')
      .text('Cảm ơn quý khách!')
      .text('Hẹn gặp lại 🍺')
      .feed(1)

      // QR code for feedback (optional)
      .feed(3)
      .cut()
      .build();
  }

  // ===== Generate kitchen ticket (for KDS/printer) =====
  async generateKitchenTicket(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        table: true,
      },
    });

    if (!order) throw new Error('Order not found');

    const builder = new EscPosBuilder();
    const now = new Date();

    return builder
      .init()
      .align('center')
      .bold(true)
      .textSize(2, 2)
      .text(`BÀN ${order.table.name}`)
      .textSize(1, 1)
      .text(`#${order.orderNumber} · ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`)
      .bold(false)
      .separator('=')
      .align('left')
      .items(
        order.items
          .filter((item) => item.status === 'pending')
          .map((item) => ({
            name: item.menuItem.name,
            qty: item.quantity,
            price: 0,
            total: 0,
            note: item.note,
          })),
      )
      .separator('=')
      .feed(3)
      .cut()
      .build();
  }

  // ===== Get receipt as text (for Bluetooth / preview) =====
  async getReceiptText(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { name: true } },
        store: true,
      },
    });

    if (!order) throw new Error('Order not found');

    const now = new Date();
    const lines: string[] = [];
    const w = 32; // characters per line (58mm paper)

    lines.push(this.center(order.store.name, w));
    lines.push(this.center(order.store.address || '', w));
    lines.push(this.center(order.store.phone ? `ĐT: ${order.store.phone}` : '', w));
    lines.push('');
    lines.push(this.center('HÓA ĐƠN THANH TOÁN', w));
    lines.push('');
    lines.push(`Bàn: ${order.table.name}`);
    lines.push(`Số HĐ: #${order.orderNumber}`);
    lines.push(`Ngày: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`);
    lines.push(order.staff ? `NV: ${order.staff.name}` : 'Khách tự order (QR)');
    lines.push('='.repeat(w));

    for (const item of order.items) {
      const total = item.unitPrice * item.quantity;
      lines.push(`${item.quantity}x ${item.menuItem.name}`);
      lines.push(`   ${this.formatVND(item.unitPrice)} x${item.quantity} = ${this.formatVND(total)}`);
      if (item.note) lines.push(`   * ${item.note}`);
    }

    lines.push('-'.repeat(w));
    lines.push(this.rightAlign(`Tạm tính: ${this.formatVND(order.subtotal)}`, w));
    if (order.discount > 0) {
      lines.push(this.rightAlign(`Giảm giá: -${this.formatVND(order.discount)}`, w));
    }
    lines.push(this.rightAlign(`TỔNG: ${this.formatVND(order.total)}`, w));
    lines.push('='.repeat(w));
    lines.push(`Thanh toán: ${this.paymentLabel(order.paymentMethod)}`);
    lines.push('');
    lines.push(this.center('Cảm ơn quý khách!', w));
    lines.push(this.center('Hẹn gặp lại', w));

    return lines.join('\n');
  }

  // ===== Helpers =====

  private formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }

  private paymentLabel(method: string | null): string {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      qr_transfer: 'Chuyển khoản QR',
      momo: 'Ví MoMo',
      card: 'Thẻ',
      mixed: 'Hỗn hợp',
    };
    return labels[method || ''] || 'Chưa thanh toán';
  }

  private center(text: string, width: number): string {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  }

  private rightAlign(text: string, width: number): string {
    const pad = Math.max(0, width - text.length);
    return ' '.repeat(pad) + text;
  }
}

import { Controller, Get, Param, Res, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('QR')
@Controller('qr')
export class QrController {
  constructor(private prisma: PrismaService) {}

  // Resolve base URL: query param > store settings > request origin
  private async resolveBaseUrl(storeId: string, req: Request, baseUrlParam?: string): Promise<string> {
    if (baseUrlParam) return baseUrlParam;

    // Check store settings for custom domain
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    const settings = (store?.settings as any) || {};
    if (settings.domain) return settings.domain;

    // Fall back to request origin
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
    // Use frontend port (not API port)
    const hostStr = String(host).replace(':3001', ':2509');
    return `${proto}://${hostStr}`;
  }

  @Get('table/:tableId')
  @ApiOperation({ summary: 'Generate QR code image for a table' })
  async getTableQr(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('baseUrl') baseUrl?: string,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { store: { select: { id: true, name: true } } },
    });

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const host = await this.resolveBaseUrl(table.storeId, req, baseUrl);
    const orderUrl = `${host}/order/${table.storeId}/${table.id}`;

    const qrBuffer = await QRCode.toBuffer(orderUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${table.name}.png"`);
    res.send(qrBuffer);
  }

  @Get('table/:tableId/svg')
  @ApiOperation({ summary: 'Generate QR code as SVG' })
  async getTableQrSvg(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('baseUrl') baseUrl?: string,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { store: { select: { id: true, name: true } } },
    });

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const host = await this.resolveBaseUrl(table.storeId, req, baseUrl);
    const orderUrl = `${host}/order/${table.storeId}/${table.id}`;

    const svg = await QRCode.toString(orderUrl, {
      type: 'svg',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }

  @Get('table/:tableId/data')
  @ApiOperation({ summary: 'Get QR code data (URL + base64 image)' })
  async getTableQrData(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Query('baseUrl') baseUrl?: string,
  ) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { store: { select: { id: true, name: true } } },
    });

    if (!table) throw new Error('Table not found');

    const host = await this.resolveBaseUrl(table.storeId, req, baseUrl);
    const orderUrl = `${host}/order/${table.storeId}/${table.id}`;

    const dataUrl = await QRCode.toDataURL(orderUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return {
      table: { id: table.id, name: table.name },
      store: table.store,
      url: orderUrl,
      qrDataUrl: dataUrl,
    };
  }

  @Get('store/:storeId/all')
  @ApiOperation({ summary: 'Get all tables QR data for a store' })
  async getAllTablesQr(
    @Param('storeId') storeId: string,
    @Req() req: Request,
    @Query('baseUrl') baseUrl?: string,
  ) {
    const tables = await this.prisma.table.findMany({
      where: { storeId },
      orderBy: [{ floor: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    const host = await this.resolveBaseUrl(storeId, req, baseUrl);

    const results = await Promise.all(
      tables.map(async (table) => {
        const orderUrl = `${host}/order/${storeId}/${table.id}`;
        const qrDataUrl = await QRCode.toDataURL(orderUrl, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
        return {
          id: table.id,
          name: table.name,
          floor: table.floor,
          url: orderUrl,
          qrDataUrl,
        };
      }),
    );

    return results;
  }
}

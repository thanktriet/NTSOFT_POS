import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TableStatus } from '@prisma/client';
import { TableService } from './table.service';

@ApiTags('Table')
@Controller('tables')
export class TableController {
  constructor(private tableService: TableService) {}

  @Get()
  @ApiOperation({ summary: 'Get tables by store' })
  findByStore(@Query('storeId') storeId: string) {
    return this.tableService.findByStore(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table by ID' })
  findById(@Param('id') id: string) {
    return this.tableService.findById(id);
  }

  @Get('qr/:qrCode')
  @ApiOperation({ summary: 'Get table by QR code (for customer)' })
  findByQr(@Param('qrCode') qrCode: string) {
    return this.tableService.findByQrCode(qrCode);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create table' })
  create(@Body() data: { storeId: string; name: string; floor?: string; seats?: number }) {
    return this.tableService.create(data);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update table status' })
  updateStatus(@Param('id') id: string, @Body() data: { status: TableStatus }) {
    return this.tableService.updateStatus(id, data.status);
  }
}

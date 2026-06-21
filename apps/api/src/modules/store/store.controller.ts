import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoreService } from './store.service';

@ApiTags('Store')
@Controller('stores')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  findById(@Param('id') id: string) {
    return this.storeService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store' })
  create(@Body() data: { name: string; address?: string; phone?: string; storeKey: string }) {
    return this.storeService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store' })
  update(@Param('id') id: string, @Body() data: { name?: string; address?: string; phone?: string; keyExpireDays?: number }) {
    return this.storeService.update(id, data);
  }

  @Put(':id/regenerate-key')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate store key' })
  regenerateKey(@Param('id') id: string, @Body() data: { newKey: string }) {
    return this.storeService.regenerateKey(id, data.newKey);
  }

  @Get(':id/settings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store settings' })
  getSettings(@Param('id') id: string) {
    return this.storeService.getSettings(id);
  }

  @Put(':id/settings')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store settings (merge)' })
  updateSettings(@Param('id') id: string, @Body() settings: Record<string, any>) {
    return this.storeService.updateSettings(id, settings);
  }
}

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StaffRole } from '@prisma/client';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Get all staff by store' })
  findByStore(@Query('storeId') storeId: string) {
    return this.staffService.findByStore(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff by ID' })
  findById(@Param('id') id: string) {
    return this.staffService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create staff member' })
  create(@Body() data: { storeId: string; name: string; pin: string; phone?: string; role?: StaffRole }) {
    return this.staffService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update staff info' })
  update(@Param('id') id: string, @Body() data: { name?: string; phone?: string; role?: StaffRole }) {
    return this.staffService.update(id, data);
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: 'Toggle staff active/inactive' })
  toggleActive(@Param('id') id: string) {
    return this.staffService.toggleActive(id);
  }

  @Put(':id/reset-pin')
  @ApiOperation({ summary: 'Reset PIN (by admin)' })
  resetPin(@Param('id') id: string, @Body() data: { newPin: string }) {
    return this.staffService.resetPin(id, data.newPin);
  }

  @Put(':id/change-pin')
  @ApiOperation({ summary: 'Change own PIN' })
  changePin(@Param('id') id: string, @Body() data: { currentPin: string; newPin: string }) {
    return this.staffService.changePin(id, data.currentPin, data.newPin);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete staff member' })
  delete(@Param('id') id: string) {
    return this.staffService.delete(id);
  }
}

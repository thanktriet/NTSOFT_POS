import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportService } from './report.service';

@ApiTags('Report')
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('dashboard/:storeId')
  @ApiOperation({ summary: 'Get dashboard summary (today vs yesterday)' })
  getDashboard(@Param('storeId') storeId: string) {
    return this.reportService.getDashboardSummary(storeId);
  }

  @Get('revenue/:storeId')
  @ApiOperation({ summary: 'Get revenue by date range' })
  getRevenue(
    @Param('storeId') storeId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start || new Date().setHours(0, 0, 0, 0));
    const endDate = new Date(end || new Date());
    return this.reportService.getRevenue(storeId, startDate, endDate);
  }

  @Get('revenue-by-day/:storeId')
  @ApiOperation({ summary: 'Get revenue by day (last N days)' })
  getRevenueByDay(
    @Param('storeId') storeId: string,
    @Query('days') days?: number,
  ) {
    return this.reportService.getRevenueByDay(storeId, days || 7);
  }

  @Get('revenue-by-hour/:storeId')
  @ApiOperation({ summary: 'Get revenue by hour (today)' })
  getRevenueByHour(@Param('storeId') storeId: string) {
    return this.reportService.getRevenueByHour(storeId);
  }

  @Get('top-items/:storeId')
  @ApiOperation({ summary: 'Get top selling items' })
  getTopItems(
    @Param('storeId') storeId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: number,
  ) {
    const startDate = new Date(start || new Date().setHours(0, 0, 0, 0));
    const endDate = new Date(end || new Date());
    return this.reportService.getTopItems(storeId, startDate, endDate, limit || 10);
  }

  @Get('staff/:storeId')
  @ApiOperation({ summary: 'Get staff performance' })
  getStaffPerformance(
    @Param('storeId') storeId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const startDate = new Date(start || new Date().setHours(0, 0, 0, 0));
    const endDate = new Date(end || new Date());
    return this.reportService.getStaffPerformance(storeId, startDate, endDate);
  }
}

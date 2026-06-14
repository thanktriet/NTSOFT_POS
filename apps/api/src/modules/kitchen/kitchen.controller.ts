import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { KitchenService } from './kitchen.service';

@ApiTags('Kitchen')
@Controller('kitchen')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('queue/:storeId')
  @ApiOperation({ summary: 'Get kitchen queue (FIFO)' })
  getQueue(@Param('storeId') storeId: string) {
    return this.kitchenService.getKitchenQueue(storeId);
  }

  @Get('completed/:storeId')
  @ApiOperation({ summary: 'Get recently completed items' })
  getCompleted(@Param('storeId') storeId: string, @Query('limit') limit?: number) {
    return this.kitchenService.getCompletedItems(storeId, limit);
  }

  @Get('stats/:storeId')
  @ApiOperation({ summary: 'Get kitchen stats' })
  getStats(@Param('storeId') storeId: string) {
    return this.kitchenService.getStats(storeId);
  }

  @Put('item/:itemId/start')
  @ApiOperation({ summary: 'Start cooking an item' })
  startCooking(@Param('itemId') itemId: string, @Body() data: { chefId?: string }) {
    return this.kitchenService.startCooking(itemId, data.chefId);
  }

  @Put('item/:itemId/ready')
  @ApiOperation({ summary: 'Mark item as ready' })
  markReady(@Param('itemId') itemId: string) {
    return this.kitchenService.markReady(itemId);
  }

  @Put('item/:itemId/served')
  @ApiOperation({ summary: 'Mark item as served' })
  markServed(@Param('itemId') itemId: string) {
    return this.kitchenService.markServed(itemId);
  }
}

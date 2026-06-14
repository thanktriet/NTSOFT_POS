import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  // ===== Public (Customer) =====

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get full menu for customer (public)' })
  getFullMenu(@Param('storeId') storeId: string) {
    return this.menuService.getFullMenu(storeId);
  }

  @Get('item/:id')
  @ApiOperation({ summary: 'Get menu item detail' })
  getItem(@Param('id') id: string) {
    return this.menuService.getItemById(id);
  }

  // ===== Protected (Staff/Admin) =====

  @Get('categories')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get categories by store' })
  getCategories(@Query('storeId') storeId: string) {
    return this.menuService.getCategories(storeId);
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category' })
  createCategory(@Body() data: { storeId: string; name: string; icon?: string }) {
    return this.menuService.createCategory(data);
  }

  @Put('categories/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id') id: string, @Body() data: { name?: string; icon?: string; sortOrder?: number }) {
    return this.menuService.updateCategory(id, data);
  }

  @Post('items')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create menu item' })
  createItem(@Body() data: { categoryId: string; name: string; price: number; description?: string; prepTime?: number }) {
    return this.menuService.createItem(data);
  }

  @Put('items/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update menu item' })
  updateItem(@Param('id') id: string, @Body() data: { name?: string; price?: number; isAvailable?: boolean }) {
    return this.menuService.updateItem(id, data);
  }

  @Put('items/:id/toggle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle item availability' })
  toggleItem(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }

  @Post('options')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create menu option' })
  createOption(@Body() data: { menuItemId: string; groupName: string; name: string; price?: number }) {
    return this.menuService.createOption(data);
  }

  @Delete('options/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete menu option' })
  deleteOption(@Param('id') id: string) {
    return this.menuService.deleteOption(id);
  }
}

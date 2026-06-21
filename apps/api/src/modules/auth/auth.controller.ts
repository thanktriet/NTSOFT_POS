import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('validate-key')
  @ApiOperation({ summary: 'Validate store key (sk-key)' })
  async validateKey(@Body() data: { storeKey: string }) {
    return this.authService.validateStoreKey(data.storeKey);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with storeId + PIN' })
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithPin(dto.storeId, dto.pin);
  }

  @Post('login-key')
  @ApiOperation({ summary: 'Login with store key + PIN (one step)' })
  async loginWithKey(@Body() data: { storeKey: string; pin: string }) {
    return this.authService.loginWithStoreKey(data.storeKey, data.pin);
  }
}

import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ===== Validate store key (sk-key) =====
  async validateStoreKey(storeKey: string) {
    const store = await this.prisma.store.findUnique({
      where: { storeKey },
      select: { id: true, name: true, address: true, logo: true, keyExpireDays: true },
    });

    if (!store) {
      throw new UnauthorizedException('Store key không hợp lệ');
    }

    // Return store info + expiry timestamp
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + store.keyExpireDays);

    return {
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        logo: store.logo,
      },
      expiresAt: expiresAt.toISOString(),
      keyExpireDays: store.keyExpireDays,
    };
  }

  // ===== Login with PIN (after sk-key validated) =====
  async loginWithPin(storeId: string, pin: string) {
    // Verify store exists
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store không tồn tại');
    }

    // Find staff by checking hashed PINs
    const allStaff = await this.prisma.staff.findMany({
      where: { storeId, isActive: true },
    });

    const matchedStaff = await this.findStaffByPin(allStaff, pin);
    if (!matchedStaff) {
      throw new UnauthorizedException('PIN không đúng');
    }

    const payload = {
      sub: matchedStaff.id,
      storeId: matchedStaff.storeId,
      role: matchedStaff.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      staff: {
        id: matchedStaff.id,
        name: matchedStaff.name,
        role: matchedStaff.role,
        storeId: matchedStaff.storeId,
      },
    };
  }

  // ===== Login with store key + PIN in one step =====
  async loginWithStoreKey(storeKey: string, pin: string) {
    const store = await this.prisma.store.findUnique({
      where: { storeKey },
    });

    if (!store) {
      throw new UnauthorizedException('Store key không hợp lệ');
    }

    return this.loginWithPin(store.id, pin);
  }

  async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
  }

  private async findStaffByPin(staffList: any[], pin: string) {
    for (const s of staffList) {
      const isMatch = await bcrypt.compare(pin, s.pin);
      if (isMatch) return s;
    }
    return null;
  }

  async validateToken(payload: any) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: payload.sub },
    });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException();
    }
    return staff;
  }
}

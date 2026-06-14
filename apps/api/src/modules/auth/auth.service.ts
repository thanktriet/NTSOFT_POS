import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async loginWithPin(storeId: string, pin: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { storeId, isActive: true },
    });

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

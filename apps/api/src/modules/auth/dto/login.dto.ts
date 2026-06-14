import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'store-id-here' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 6)
  pin: string;
}

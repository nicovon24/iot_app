import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ example: 'changeme' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Opaque app session token — never the raw ThingsBoard JWT' })
  sessionToken!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'operator@example.com' })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ example: 'changeme' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({ example: 'https://thingsboard.cloud' })
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true })
  thingsboardUrl!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Opaque app session token — never the raw ThingsBoard JWT' })
  sessionToken!: string;
}

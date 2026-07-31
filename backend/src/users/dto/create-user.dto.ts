import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'operator@customer-a.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'changeme123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: ['ADMIN', 'READER'] })
  @IsIn(['ADMIN', 'READER'])
  role!: 'ADMIN' | 'READER';

  @ApiProperty({ description: 'ThingsBoard customerId this user is scoped to' })
  @IsString()
  customerId!: string;
}

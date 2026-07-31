import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate against the app (backed by ThingsBoard)' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { sessionToken } = await this.authService.login(dto);
    return { sessionToken };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiSecurity('session-token')
  @ApiOperation({ summary: 'Invalidate the current app session' })
  @ApiResponse({ status: 204, description: 'Session invalidated' })
  async logout(@Headers('x-session-token') sessionToken: string): Promise<void> {
    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }
  }
}

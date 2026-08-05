import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentSession } from '../common/decorators/current-session.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AppSession, AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

export interface CurrentUserResponse {
  email: string;
  authority: AppSession['authority'];
  appRole: AppSession['appRole'];
  customerId: string | null;
}

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

  @Get('me')
  @ApiSecurity('session-token')
  @ApiOperation({ summary: "Return the caller's own session identity (role/authority/customer), for frontend UI gating" })
  @ApiResponse({ status: 200 })
  me(@CurrentSession() session: AppSession | null): CurrentUserResponse {
    if (!session) {
      throw new ForbiddenException('No active session');
    }
    return {
      email: session.email,
      authority: session.authority,
      appRole: session.appRole,
      customerId: session.customerId,
    };
  }
}

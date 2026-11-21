import { BadRequestException } from '@nestjs/common';
import { ThingsboardClientService } from './thingsboard-client.service';
import { ConfigService } from '../config/config.service';
import { RedisService } from './redis.service';

describe('ThingsboardClientService instance selection', () => {
  const config = {
    thingsboardUrl: 'https://first.example.com',
    thingsboardAllowedUrls: ['https://first.example.com', 'https://second.example.com'],
  } as ConfigService;
  const service = new ThingsboardClientService(config, {} as RedisService);

  it('accepts only configured origins', () => {
    expect(service.validateUrl('https://second.example.com/')).toBe('https://second.example.com');
    expect(() => service.validateUrl('https://other.example.com')).toThrow(BadRequestException);
    expect(() => service.validateUrl('https://first.example.com/path')).toThrow(BadRequestException);
    expect(() => service.validateUrl('https://user:pass@first.example.com')).toThrow(BadRequestException);
  });

  it('rejects unlisted origins before sending credentials', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    expect(() => service.validateUrl('https://other.example.com')).toThrow(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not follow redirects with user credentials', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 302 } as Response);
    await expect(service.loginWithCredentials('operator', 'secret', 'https://first.example.com'))
      .rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://first.example.com/api/auth/login',
      expect.objectContaining({ redirect: 'manual' }),
    );
    fetchSpy.mockRestore();
  });
});

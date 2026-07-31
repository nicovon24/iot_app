import { BadRequestException, Injectable } from '@nestjs/common';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntityRef, TbPageData, TbUserProfile } from '../types';

function toEntityRef(user: TbUserProfile): EntityRef {
  return { id: user.id.id, type: 'CUSTOMER', name: user.email };
}

@Injectable()
export class UsersService {
  constructor(private readonly tb: ThingsboardClientService) {}

  async create(email: string, password: string, role: 'ADMIN' | 'READER', customerId: string): Promise<EntityRef> {
    const created = await this.tb.request<TbUserProfile>('POST', '/api/user?sendActivationMail=false', {
      email,
      authority: 'CUSTOMER_USER',
      customerId: { id: customerId, entityType: 'CUSTOMER' },
      additionalInfo: { appRole: role },
    });

    // TB's real activation flow: fetch the activation link (contains a one-time token), then
    // activate with the chosen password — this is how a Customer User gets a usable password
    // without emailing an activation link.
    const { value: activationLink } = await this.tb.request<{ value: string }>(
      'GET',
      `/api/user/${created.id.id}/activationLink`,
    );
    const activateToken = new URL(activationLink).searchParams.get('activateToken');
    if (!activateToken) {
      throw new BadRequestException('ThingsBoard did not return an activation token');
    }

    await this.tb.request('POST', '/api/noauth/activate', { activateToken, password });

    return toEntityRef(created);
  }

  async listByCustomer(customerId: string): Promise<EntityRef[]> {
    const page = await this.tb.request<TbPageData<TbUserProfile>>(
      'GET',
      `/api/customer/${customerId}/users?pageSize=100&page=0`,
    );
    return page.data.map(toEntityRef);
  }

  async delete(userId: string): Promise<void> {
    const user = await this.tb.request<TbUserProfile>('GET', `/api/user/${userId}`);
    if (user.authority === 'TENANT_ADMIN' || user.authority === 'SYS_ADMIN') {
      throw new BadRequestException('The tenant admin account cannot be deleted via this API');
    }
    await this.tb.request<void>('DELETE', `/api/user/${userId}`);
  }
}

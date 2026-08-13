export interface CurrentUser {
  email: string;
  authority: 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';
  appRole: 'ADMIN' | 'READER' | null;
  customerId: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'ADMIN' | 'READER';
  customerId: string;
}

export interface ImpersonationMeta {
  logId: string;
  label: string;
}

export type AttributesPayload = Record<string, unknown>;

export type AttributeScope = 'CLIENT_SCOPE' | 'SERVER_SCOPE' | 'SHARED_SCOPE';

export interface Attribute {
  key: string;
  value: unknown;
  lastUpdateTs: number;
}

export type AttributesByScope = Record<AttributeScope, Attribute[]>;

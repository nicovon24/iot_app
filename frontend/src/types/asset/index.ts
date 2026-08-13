export interface CreateAssetRequest {
  name: string;
  type: string;
  label?: string;
  customerId: string;
  levelIndex: number;
  parentId: string;
}

export interface PatchAssetRequest {
  name?: string;
  type?: string;
  label?: string;
}

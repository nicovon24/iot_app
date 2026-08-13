export interface HierarchyLevel {
  levelIndex: number;
  name: string;
}

export interface CreateCustomerRequest {
  name: string;
  parentCustomerId?: string;
  hierarchyLevels: HierarchyLevel[];
}

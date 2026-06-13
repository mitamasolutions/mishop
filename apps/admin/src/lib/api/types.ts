export type UserStatus = 'invited' | 'active' | 'locked' | 'disabled';

export interface UserStoreRoleOutput {
  assignmentId: string;
  storeId: string | null;
  roleId: string;
  roleName: string;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  storeRoles: UserStoreRoleOutput[];
}

export interface RoleOutput {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreOutput {
  id: string;
  name: string;
  code: string;
  url: string | null;
  currencyCode: string;
  regionId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SettingType = 'string' | 'number' | 'boolean' | 'json';
export type SettingSource = 'override' | 'global' | 'default';

export interface SettingOutput {
  key: string;
  type: SettingType;
  value: unknown;
  storeId: string | null;
  source: SettingSource;
}

export interface ActivityLogEntryOutput {
  id: string;
  userId: string | null;
  storeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogPage {
  items: ActivityLogEntryOutput[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CurrencyOutput {
  code: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
  name: string;
}

export interface RegionOutput {
  id: string;
  name: string;
  currencyCode: string;
  automaticTaxes: boolean;
}

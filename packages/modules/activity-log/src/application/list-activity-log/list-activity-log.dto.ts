export interface ListActivityLogInput {
  storeId?: string | null;
  userId?: string;
  entityType?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
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
  createdAt: Date;
}

export interface ListActivityLogOutput {
  items: ActivityLogEntryOutput[];
  total: number;
  page: number;
  pageSize: number;
}

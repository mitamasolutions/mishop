export interface CreateZoneInput {
  territoryId: string;
  name: string;
  code: string;
  description?: string | null;
  actorUserId: string;
}

export interface CreateZoneOutput {
  zoneId: string;
}

export interface UpdateZoneInput {
  zoneId: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  description?: string | null;
  actorUserId: string;
}

export interface DeactivateZoneInput {
  zoneId: string;
  actorUserId: string;
}

export interface ZoneOutput {
  id: string;
  territoryId: string;
  name: string;
  code: string;
  isActive: boolean;
  description: string | null;
}

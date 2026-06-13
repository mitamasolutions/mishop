export interface RefreshSessionInput {
  refreshToken: string;
  ip?: string | null;
}

export interface RefreshSessionOutput {
  accessToken: string;
  refreshToken: string;
}

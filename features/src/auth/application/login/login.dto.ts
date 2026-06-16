export interface LoginInput {
  email: string;
  password: string;
  ip?: string | null;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    isSuperAdmin: boolean;
  };
}

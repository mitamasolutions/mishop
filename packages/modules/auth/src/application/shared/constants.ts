export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const INVITATION_TOKEN_TTL_HOURS = 72;
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
export const PASSWORD_HISTORY_LIMIT = 4;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

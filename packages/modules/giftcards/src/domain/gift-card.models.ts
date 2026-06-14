export type GiftCardStatus = 'active' | 'depleted' | 'expired' | 'disabled';

export interface GiftCardProps {
  id: string;
  storeId: string;
  code: string;
  initialBalance: number;
  balance: number;
  currencyCode: string;
  status: GiftCardStatus;
  expiresAt: Date | null;
  issuedToCustomerId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftCardRedemption {
  id: string;
  storeId: string;
  giftCardId: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
  createdAt: Date;
}

export interface GiftCardRedemptionOutput {
  giftCardId: string;
  redeemedAmount: number;
  remainingBalance: number;
  status: GiftCardStatus;
}

export function normalizeGiftCardCode(code: string): string {
  return code.trim().toUpperCase();
}

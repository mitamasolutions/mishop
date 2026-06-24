import type { GiftCardProps } from '../domain/gift-card.models';

export type GiftCardOutput = Omit<GiftCardProps, 'createdAt' | 'updatedAt' | 'expiresAt'> & {
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toGiftCardOutput(card: GiftCardProps): GiftCardOutput {
  return {
    ...card,
    expiresAt: card.expiresAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

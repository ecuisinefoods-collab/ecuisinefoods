export type PriceVariant = {
  price: number;
  sale_price?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
};

export function getEffectivePrice(variant: PriceVariant, now = Date.now()): number {
  const sale = variant.sale_price == null ? null : Number(variant.sale_price);
  if (sale == null || !Number.isFinite(sale) || sale <= 0 || sale >= Number(variant.price)) {
    return Number(variant.price);
  }
  const starts = variant.sale_starts_at ? new Date(variant.sale_starts_at).getTime() : null;
  const ends = variant.sale_ends_at ? new Date(variant.sale_ends_at).getTime() : null;
  if (starts != null && (!Number.isFinite(starts) || now < starts)) return Number(variant.price);
  if (ends != null && (!Number.isFinite(ends) || now >= ends)) return Number(variant.price);
  return sale;
}

export function getDiscountPercent(variant: PriceVariant, now = Date.now()): number {
  const regular = Number(variant.price);
  const current = getEffectivePrice(variant, now);
  return regular > 0 && current < regular ? Math.round((1 - current / regular) * 100) : 0;
}

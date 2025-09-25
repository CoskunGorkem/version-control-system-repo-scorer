export const GLOBAL_DECIMAL_PLACES = 5;

export const round = (
  value: number,
  decimals = GLOBAL_DECIMAL_PLACES,
): number => {
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : value;
};

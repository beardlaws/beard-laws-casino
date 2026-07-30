export const ATM_FEE = 799;
export const MAX_ATM_WITHDRAWALS = 3;
export const MAX_SPIN_BET = 50000;

export function dollars(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function parseDollarInput(value) {
  const normalized = String(value).replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

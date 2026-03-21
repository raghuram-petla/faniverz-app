/**
 * Formats a number as compact USD currency.
 * Examples: 25000000 → "$25M", 1500000 → "$1.5M", 500000 → "$500K", 800 → "$800"
 */
// @contract returns "$0" for zero/negative values; never returns undefined
// @edge values between 1B and 999B display as "B", above 999B as "T"
export function formatCompactCurrency(amount: number): string {
  if (amount <= 0) return '$0';

  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `$${stripTrailingZero(billions.toFixed(1))}B`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${stripTrailingZero(millions.toFixed(1))}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${stripTrailingZero(thousands.toFixed(1))}K`;
  }
  return `$${amount}`;
}

function stripTrailingZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

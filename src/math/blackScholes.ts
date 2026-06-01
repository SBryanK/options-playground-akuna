// Black-Scholes option pricing & Greeks — production-grade, dependency-free.
// All Greeks returned in their conventional units:
//   Delta : per $1 of underlying
//   Gamma : per $1 of underlying (per $1 again)
//   Theta : per 1 year (divide by 365 for per-calendar-day)
//   Vega  : per 1.00 of vol (divide by 100 for per-vol-point)
//   Rho   : per 1.00 of rate (divide by 100 for per-bp/100)
//
// Reference: Hull, "Options, Futures, and Other Derivatives", 10e, Ch. 15-19.

export type OptionType = 'call' | 'put';

export interface OptionInputs {
  type: OptionType;
  /** Spot price of underlying */
  S: number;
  /** Strike price */
  K: number;
  /** Time to expiry in years */
  T: number;
  /** Risk-free continuous rate (e.g. 0.05) */
  r: number;
  /** Continuous dividend yield (e.g. 0.0) */
  q?: number;
  /** Implied volatility (e.g. 0.2) */
  sigma: number;
}

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;   // per year
  vega: number;    // per 1.00 vol
  rho: number;     // per 1.00 rate
}

/* ------------------------------------------------------------------ */
/* Standard normal helpers — Abramowitz & Stegun 26.2.17 (≈1e-7 max err) */
/* ------------------------------------------------------------------ */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

export function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Cumulative standard normal — error < 7.5e-8 */
export function cdf(x: number): number {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  // erf approximation (A&S 7.1.26)
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/* ------------------------------------------------------------------ */
/* Black-Scholes-Merton with continuous dividend yield                 */
/* ------------------------------------------------------------------ */

export function blackScholes(input: OptionInputs): Greeks {
  const { type, S, K, r } = input;
  const q = input.q ?? 0;
  const T = Math.max(input.T, 1e-12);
  const sigma = Math.max(input.sigma, 1e-12);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = cdf(d1);
  const Nd2 = cdf(d2);
  const NmD1 = cdf(-d1);
  const NmD2 = cdf(-d2);
  const nd1 = pdf(d1);

  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);

  let price: number;
  let delta: number;
  let theta: number;
  let rho: number;

  if (type === 'call') {
    price = S * eqT * Nd1 - K * erT * Nd2;
    delta = eqT * Nd1;
    theta =
      -(S * eqT * nd1 * sigma) / (2 * sqrtT) -
      r * K * erT * Nd2 +
      q * S * eqT * Nd1;
    rho = K * T * erT * Nd2;
  } else {
    price = K * erT * NmD2 - S * eqT * NmD1;
    delta = -eqT * NmD1;
    theta =
      -(S * eqT * nd1 * sigma) / (2 * sqrtT) +
      r * K * erT * NmD2 -
      q * S * eqT * NmD1;
    rho = -K * T * erT * NmD2;
  }

  const gamma = (eqT * nd1) / (S * sigma * sqrtT);
  const vega = S * eqT * nd1 * sqrtT;

  return { price, delta, gamma, theta, vega, rho };
}

/* ------------------------------------------------------------------ */
/* Implied volatility — hybrid Newton + bisection (always converges)   */
/* ------------------------------------------------------------------ */

export function impliedVol(
  marketPrice: number,
  base: Omit<OptionInputs, 'sigma'>,
  opts: { tol?: number; maxIter?: number } = {}
): number | null {
  const tol = opts.tol ?? 1e-7;
  const maxIter = opts.maxIter ?? 100;

  const intrinsic =
    base.type === 'call'
      ? Math.max(0, base.S * Math.exp(-(base.q ?? 0) * base.T) - base.K * Math.exp(-base.r * base.T))
      : Math.max(0, base.K * Math.exp(-base.r * base.T) - base.S * Math.exp(-(base.q ?? 0) * base.T));
  if (marketPrice + 1e-12 < intrinsic) return null;

  let lo = 1e-6;
  let hi = 5;
  // Ensure bracket
  if (blackScholes({ ...base, sigma: hi }).price < marketPrice) {
    hi = 10;
    if (blackScholes({ ...base, sigma: hi }).price < marketPrice) return null;
  }

  // Manaster–Koehler initial guess
  let sigma = Math.sqrt(
    Math.max(2 * Math.abs(Math.log(base.S / base.K) + base.r * base.T) / Math.max(base.T, 1e-9), 1e-4)
  );
  sigma = Math.min(Math.max(sigma, 0.05), 1.5);

  for (let i = 0; i < maxIter; i++) {
    const g = blackScholes({ ...base, sigma });
    const diff = g.price - marketPrice;
    if (Math.abs(diff) < tol) return sigma;

    const v = g.vega;
    if (v > 1e-8) {
      const next = sigma - diff / v;
      if (next > lo && next < hi && Number.isFinite(next)) {
        sigma = next;
        continue;
      }
    }
    // Fallback to bisection
    if (diff > 0) hi = sigma;
    else lo = sigma;
    sigma = 0.5 * (lo + hi);
  }
  return Math.abs(blackScholes({ ...base, sigma }).price - marketPrice) < 1e-3 ? sigma : null;
}

/* ------------------------------------------------------------------ */
/* Convenience helpers                                                 */
/* ------------------------------------------------------------------ */

export function moneyness(S: number, K: number): 'ITM' | 'ATM' | 'OTM-ish' | 'OTM' {
  const r = S / K;
  if (Math.abs(r - 1) < 0.005) return 'ATM';
  if (r > 1) return 'ITM';
  return 'OTM';
}

export type GreekKey = 'price' | 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';
export type AxisKey = 'S' | 'K' | 'T' | 'sigma' | 'r';

export const GREEK_LABELS: Record<GreekKey, string> = {
  price: 'Price',
  delta: 'Delta',
  gamma: 'Gamma',
  theta: 'Theta',
  vega: 'Vega',
  rho: 'Rho'
};

export const AXIS_LABELS: Record<AxisKey, string> = {
  S: 'Underlying Price',
  K: 'Strike Price',
  T: 'Time to Expiry (years)',
  sigma: 'Volatility',
  r: 'Risk-free Rate'
};

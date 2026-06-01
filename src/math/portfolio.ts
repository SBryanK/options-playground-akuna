import { blackScholes, type Greeks, type OptionInputs, type OptionType } from './blackScholes';

export type LegKind = 'call' | 'put' | 'stock';

export interface PortfolioLeg {
  id: string;
  kind: LegKind;
  /** Long positive, short negative. For options, # of contracts (1 contract = 1 share by default). */
  qty: number;
  /** Multiplier per contract (e.g. 100 for US equity options). Stocks ignore this. */
  multiplier: number;
  K?: number;
  T?: number;
  sigma?: number;
  /** Premium paid (positive = debit / paid). For stocks, this is cost basis per share. */
  premium: number;
}

export interface PortfolioContext {
  S: number;
  r: number;
  q: number;
}

export interface AggregateGreeks extends Greeks {
  notional: number;
  cost: number;
}

const ZERO: AggregateGreeks = {
  price: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, notional: 0, cost: 0
};

export function legGreeks(leg: PortfolioLeg, ctx: PortfolioContext): AggregateGreeks {
  if (leg.kind === 'stock') {
    return {
      price: ctx.S,
      delta: 1,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      notional: ctx.S * leg.qty,
      cost: leg.premium * leg.qty
    };
  }
  const inputs: OptionInputs = {
    type: leg.kind as OptionType,
    S: ctx.S,
    K: leg.K ?? ctx.S,
    T: Math.max(leg.T ?? 0.0001, 1e-9),
    r: ctx.r,
    q: ctx.q,
    sigma: Math.max(leg.sigma ?? 0.2, 1e-6)
  };
  const g = blackScholes(inputs);
  return {
    ...g,
    notional: g.price * leg.qty * leg.multiplier,
    cost: leg.premium * leg.qty * leg.multiplier
  };
}

export function aggregate(legs: PortfolioLeg[], ctx: PortfolioContext): AggregateGreeks {
  const acc: AggregateGreeks = { ...ZERO };
  for (const leg of legs) {
    const g = legGreeks(leg, ctx);
    const m = leg.kind === 'stock' ? 1 : leg.multiplier;
    const w = leg.qty * m;
    acc.price += g.price * w;
    acc.delta += g.delta * w;
    acc.gamma += g.gamma * w;
    acc.theta += g.theta * w;
    acc.vega += g.vega * w;
    acc.rho += g.rho * w;
    acc.notional += g.notional;
    acc.cost += g.cost;
  }
  return acc;
}

export interface PnLPoint {
  S: number;
  pnlNow: number;     // P/L at current T (unchanged)
  pnlExpiry: number;  // P/L at expiry (intrinsic only)
}

/** Compute P/L curves over a spot range. T-shift is in years (e.g. 0 = now, leg.T = expiry). */
export function pnlCurve(
  legs: PortfolioLeg[],
  ctx: PortfolioContext,
  fromS: number,
  toS: number,
  steps = 121
): PnLPoint[] {
  const pts: PnLPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const S = fromS + ((toS - fromS) * i) / (steps - 1);
    let nowVal = 0;
    let expVal = 0;
    let cost = 0;
    for (const leg of legs) {
      const w = (leg.kind === 'stock' ? 1 : leg.multiplier) * leg.qty;
      cost += leg.premium * w;
      if (leg.kind === 'stock') {
        nowVal += S * w;
        expVal += S * w;
      } else {
        const inputs: OptionInputs = {
          type: leg.kind as OptionType,
          S,
          K: leg.K ?? S,
          T: Math.max(leg.T ?? 1e-6, 1e-9),
          r: ctx.r,
          q: ctx.q,
          sigma: Math.max(leg.sigma ?? 0.2, 1e-6)
        };
        nowVal += blackScholes(inputs).price * w;
        const intrinsic =
          leg.kind === 'call' ? Math.max(0, S - (leg.K ?? S)) : Math.max(0, (leg.K ?? S) - S);
        expVal += intrinsic * w;
      }
    }
    pts.push({ S, pnlNow: nowVal - cost, pnlExpiry: expVal - cost });
  }
  return pts;
}

import Plotly, { type PlotData } from 'plotly.js-dist-min';
import type { OptionInputs } from '../../math/blackScholes';
import { aggregate, pnlCurve, type PortfolioLeg } from '../../math/portfolio';
import { baseConfig, baseLayout, palette } from '../../utils/plotTheme';
import { fmt, fmtMoney } from '../../utils/format';

export interface PnLState {
  fromS: number;
  toS: number;
  steps: number;
}

export function renderPnL(s: PnLState): string {
  return `
    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div class="w-28">
        <label class="label">Spot From</label>
        <input class="input mono" type="number" data-pnl-fromS value="${s.fromS}" step="0.5" />
      </div>
      <div class="w-28">
        <label class="label">Spot To</label>
        <input class="input mono" type="number" data-pnl-toS value="${s.toS}" step="0.5" />
      </div>
      <div class="w-28">
        <label class="label">Steps</label>
        <input class="input mono" type="number" data-pnl-steps value="${s.steps}" step="1" />
      </div>
      <div class="ml-auto text-xs text-slate-500 dark:text-slate-400">
        Edit legs in <strong>Portfolio Analysis</strong>.
      </div>
    </div>
    <div data-pnl-plot class="w-full h-[440px]"></div>
    <div data-pnl-stats class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3"></div>
  `;
}

export function mountPnL(
  el: HTMLElement,
  getBase: () => OptionInputs,
  getLegs: () => PortfolioLeg[],
  state: PnLState
): { refresh: () => void; rethemed: () => void } {
  const plotEl = el.querySelector('[data-pnl-plot]') as HTMLElement;
  const statsEl = el.querySelector('[data-pnl-stats]') as HTMLElement;

  const draw = (): void => {
    const base = getBase();
    const legs = getLegs();
    const ctx = { S: base.S, r: base.r, q: base.q ?? 0 };

    const points = pnlCurve(legs, ctx, state.fromS, state.toS, Math.max(2, Math.floor(state.steps)));
    const xs = points.map((p) => p.S);
    const yNow = points.map((p) => p.pnlNow);
    const yExp = points.map((p) => p.pnlExpiry);

    const traceExp: Partial<PlotData> = {
      x: xs,
      y: yExp,
      mode: 'lines',
      type: 'scatter',
      name: 'P/L at Expiry',
      line: { color: palette.brand, width: 2.5 },
      hovertemplate: 'S=%{x:.2f}<br>P/L (expiry)=%{y:.2f}<extra></extra>'
    };
    const traceNow: Partial<PlotData> = {
      x: xs,
      y: yNow,
      mode: 'lines',
      type: 'scatter',
      name: 'P/L Now',
      line: { color: palette.brand2, width: 2, dash: 'dash' as any },
      hovertemplate: 'S=%{x:.2f}<br>P/L (now)=%{y:.2f}<extra></extra>'
    };

    // Break-even shading: positive vs negative regions on expiry curve.
    const zeroLine: Partial<PlotData> = {
      x: [xs[0], xs[xs.length - 1]],
      y: [0, 0],
      mode: 'lines',
      type: 'scatter',
      name: 'breakeven',
      hoverinfo: 'skip' as any,
      line: { color: palette.inkDim, width: 1, dash: 'dot' as any },
      showlegend: false
    };

    // Mark current spot.
    const idxS = Math.round(((base.S - state.fromS) / (state.toS - state.fromS)) * (xs.length - 1));
    const valid = idxS >= 0 && idxS < xs.length;
    const markCurrent: Partial<PlotData> = valid
      ? {
          x: [base.S],
          y: [yExp[idxS]],
          mode: 'markers',
          type: 'scatter',
          name: 'Spot',
          marker: { color: palette.warn, size: 10, symbol: 'diamond', line: { color: '#fff', width: 1 } },
          hovertemplate: 'Spot %{x:.2f} → %{y:.2f}<extra></extra>',
          showlegend: false
        }
      : { x: [], y: [], type: 'scatter', mode: 'markers', showlegend: false };

    Plotly.react(
      plotEl,
      [zeroLine, traceExp, traceNow, markCurrent],
      baseLayout({
        xaxis: { ...baseLayout().xaxis, title: 'Underlying Price at Evaluation' },
        yaxis: { ...baseLayout().yaxis, title: 'P/L ($)', zeroline: true } as any,
        legend: { orientation: 'h', y: 1.05, x: 0 } as any
      }),
      baseConfig
    );

    renderPnLStats(statsEl, legs, ctx, points);
  };

  ;['fromS', 'toS', 'steps'].forEach((k) => {
    el.querySelector(`[data-pnl-${k}]`)!.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      if (Number.isFinite(v)) {
        (state as any)[k] = v;
        draw();
      }
    });
  });

  draw();
  return { refresh: draw, rethemed: draw };
}

function renderPnLStats(
  el: HTMLElement,
  legs: PortfolioLeg[],
  ctx: { S: number; r: number; q: number },
  points: { S: number; pnlExpiry: number }[]
): void {
  const agg = aggregate(legs, ctx);
  const cost = -agg.cost; // negative cost = credit received
  const maxProfit = points.reduce((m, p) => Math.max(m, p.pnlExpiry), -Infinity);
  const maxLoss = points.reduce((m, p) => Math.min(m, p.pnlExpiry), Infinity);
  const breakevens = findZeroCrossings(points);

  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-x-8 gap-y-2 justify-between">
      <div class="text-sm font-semibold">Strategy Snapshot</div>
      <div class="text-xs text-slate-500 dark:text-slate-400">${legs.length} leg(s) · multiplier-aware</div>
    </div>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      ${stat('Net Cost', fmtMoney(cost))}
      ${stat('Mark Value', fmtMoney(agg.price * legMul(legs)))}
      ${stat('Max Profit (expiry)', Number.isFinite(maxProfit) ? fmtMoney(maxProfit) : '—')}
      ${stat('Max Loss (expiry)', Number.isFinite(maxLoss) ? fmtMoney(maxLoss) : '—')}
      ${stat('Break-even(s)', breakevens.length ? breakevens.map((b) => fmt(b, 2)).join(', ') : '—')}
      ${stat('Net Delta', fmt(agg.delta, 4))}
    </div>
  `;
}

function legMul(legs: PortfolioLeg[]): number {
  // For display only — sum of |qty*mult| as a rough notional unit.
  return 1;
}

function stat(label: string, value: string): string {
  return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value mono">${value}</div></div>`;
}

function findZeroCrossings(points: { S: number; pnlExpiry: number }[]): number[] {
  const xs: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((a.pnlExpiry <= 0 && b.pnlExpiry >= 0) || (a.pnlExpiry >= 0 && b.pnlExpiry <= 0)) {
      const t = a.pnlExpiry === b.pnlExpiry ? 0 : -a.pnlExpiry / (b.pnlExpiry - a.pnlExpiry);
      xs.push(a.S + t * (b.S - a.S));
    }
  }
  // Deduplicate close roots
  return xs.filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 1e-3);
}

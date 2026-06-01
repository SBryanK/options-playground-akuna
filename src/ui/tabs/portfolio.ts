import Plotly from 'plotly.js-dist-min';
import {
  blackScholes,
  impliedVol,
  type OptionInputs
} from '../../math/blackScholes';
import {
  aggregate,
  legGreeks,
  type LegKind,
  type PortfolioLeg
} from '../../math/portfolio';
import { baseConfig, baseLayout, palette } from '../../utils/plotTheme';
import { downloadJSON, fmt, fmtMoney, uid } from '../../utils/format';

export interface PortfolioState {
  legs: PortfolioLeg[];
}

const PRESETS: Record<string, () => PortfolioLeg[]> = {
  'Long Call': () => [mkLeg({ kind: 'call', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 4.5 })],
  'Long Put': () => [mkLeg({ kind: 'put', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 3.2 })],
  'Bull Call Spread': () => [
    mkLeg({ kind: 'call', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 5.6 }),
    mkLeg({ kind: 'call', qty: -1, K: 110, T: 0.25, sigma: 0.25, premium: 1.85 })
  ],
  'Bear Put Spread': () => [
    mkLeg({ kind: 'put', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 4.7 }),
    mkLeg({ kind: 'put', qty: -1, K: 90, T: 0.25, sigma: 0.25, premium: 1.6 })
  ],
  'Long Straddle': () => [
    mkLeg({ kind: 'call', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 5.6 }),
    mkLeg({ kind: 'put', qty: 1, K: 100, T: 0.25, sigma: 0.25, premium: 4.7 })
  ],
  'Iron Condor': () => [
    mkLeg({ kind: 'put', qty: 1, K: 85, T: 0.25, sigma: 0.27, premium: 0.55 }),
    mkLeg({ kind: 'put', qty: -1, K: 92, T: 0.25, sigma: 0.26, premium: 1.4 }),
    mkLeg({ kind: 'call', qty: -1, K: 108, T: 0.25, sigma: 0.24, premium: 1.2 }),
    mkLeg({ kind: 'call', qty: 1, K: 115, T: 0.25, sigma: 0.25, premium: 0.4 })
  ],
  'Covered Call': () => [
    mkLeg({ kind: 'stock', qty: 100, premium: 100 }),
    mkLeg({ kind: 'call', qty: -1, K: 105, T: 0.25, sigma: 0.25, premium: 2.4 })
  ],
  'Protective Put': () => [
    mkLeg({ kind: 'stock', qty: 100, premium: 100 }),
    mkLeg({ kind: 'put', qty: 1, K: 95, T: 0.25, sigma: 0.25, premium: 1.7 })
  ]
};

function mkLeg(p: Partial<PortfolioLeg> & { kind: LegKind }): PortfolioLeg {
  return {
    id: uid(),
    kind: p.kind,
    qty: p.qty ?? 1,
    multiplier: p.multiplier ?? (p.kind === 'stock' ? 1 : 100),
    K: p.K,
    T: p.T,
    sigma: p.sigma,
    premium: p.premium ?? 0
  };
}

export function renderPortfolio(s: PortfolioState): string {
  return `
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div>
        <h3 class="text-base font-semibold">Multi-Leg Portfolio</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">All option legs are evaluated against the global Spot / Rate / Yield above.</p>
      </div>
      <div class="ml-auto flex items-center gap-2 flex-wrap">
        <select class="input w-44" data-pf-preset>
          <option value="">Load Preset…</option>
          ${Object.keys(PRESETS).map((k) => `<option value="${k}">${k}</option>`).join('')}
        </select>
        <button class="btn" data-pf-add="call">+ Call</button>
        <button class="btn" data-pf-add="put">+ Put</button>
        <button class="btn" data-pf-add="stock">+ Stock</button>
        <button class="btn" data-pf-export>Export JSON</button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
          <tr>
            <th class="text-left px-3 py-2 font-medium">Type</th>
            <th class="text-left px-3 py-2 font-medium">Qty</th>
            <th class="text-left px-3 py-2 font-medium">Mult</th>
            <th class="text-left px-3 py-2 font-medium">Strike</th>
            <th class="text-left px-3 py-2 font-medium">T (yrs)</th>
            <th class="text-left px-3 py-2 font-medium">σ</th>
            <th class="text-left px-3 py-2 font-medium">Premium</th>
            <th class="text-left px-3 py-2 font-medium">Mark</th>
            <th class="text-left px-3 py-2 font-medium">Δ · Γ · Θ · ν · ρ</th>
            <th class="text-right px-3 py-2 font-medium">…</th>
          </tr>
        </thead>
        <tbody data-pf-rows></tbody>
      </table>
    </div>

    <div class="mt-5 grid lg:grid-cols-2 gap-5">
      <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
        <div class="text-sm font-semibold mb-2">Aggregate Greeks</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" data-pf-agg></div>
      </div>
      <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
        <div class="text-sm font-semibold mb-2">Net Delta vs Spot</div>
        <div data-pf-deltaPlot class="w-full h-[260px]"></div>
      </div>
    </div>
  `;
}

export function mountPortfolio(
  el: HTMLElement,
  getBase: () => OptionInputs,
  state: PortfolioState,
  onChange: () => void
): { refresh: () => void; rethemed: () => void } {
  const tbody = el.querySelector('[data-pf-rows]') as HTMLElement;
  const aggEl = el.querySelector('[data-pf-agg]') as HTMLElement;
  const plotEl = el.querySelector('[data-pf-deltaPlot]') as HTMLElement;

  const renderRows = (): void => {
    tbody.innerHTML = state.legs.map((leg) => rowHtml(leg)).join('');
    tbody.querySelectorAll<HTMLElement>('[data-leg-id]').forEach((row) => {
      const id = row.dataset.legId!;
      row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const leg = state.legs.find((l) => l.id === id);
          if (!leg) return;
          const f = inp.dataset.field as keyof PortfolioLeg;
          if (f === 'kind') {
            leg.kind = inp.value as LegKind;
            leg.multiplier = leg.kind === 'stock' ? 1 : 100;
          } else {
            const v = parseFloat((inp as HTMLInputElement).value);
            if (Number.isFinite(v)) (leg as any)[f] = v;
          }
          renderRows();
          recompute();
        });
      });
      row.querySelector('[data-action="remove"]')!.addEventListener('click', () => {
        state.legs = state.legs.filter((l) => l.id !== id);
        renderRows();
        recompute();
      });
      row.querySelector('[data-action="iv"]')!.addEventListener('click', () => {
        const leg = state.legs.find((l) => l.id === id);
        if (!leg || leg.kind === 'stock') return;
        const base = getBase();
        const iv = impliedVol(leg.premium, {
          type: leg.kind,
          S: base.S,
          K: leg.K ?? base.S,
          T: Math.max(leg.T ?? 0.25, 1e-6),
          r: base.r,
          q: base.q ?? 0
        });
        if (iv != null) {
          leg.sigma = iv;
          renderRows();
          recompute();
        } else {
          alert('Could not solve implied volatility — premium may be below intrinsic value.');
        }
      });
    });
  };

  const recompute = (): void => {
    const base = getBase();
    const ctx = { S: base.S, r: base.r, q: base.q ?? 0 };
    const agg = aggregate(state.legs, ctx);

    aggEl.innerHTML = `
      ${stat('Mark', fmtMoney(agg.notional))}
      ${stat('Net Cost', fmtMoney(-agg.cost))}
      ${stat('Δ Delta', fmt(agg.delta, 4))}
      ${stat('Γ Gamma', fmt(agg.gamma, 5))}
      ${stat('Θ Theta /yr', fmt(agg.theta, 4))}
      ${stat('ν Vega /1.00σ', fmt(agg.vega, 4))}
      ${stat('ρ Rho /1.00r', fmt(agg.rho, 4))}
      ${stat('# Legs', String(state.legs.length))}
    `;

    // Net Delta curve over a spot range.
    const fromS = Math.max(1, base.S * 0.6);
    const toS = base.S * 1.4;
    const N = 121;
    const xs: number[] = new Array(N);
    const ys: number[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const S = fromS + ((toS - fromS) * i) / (N - 1);
      const a = aggregate(state.legs, { ...ctx, S });
      xs[i] = S;
      ys[i] = a.delta;
    }
    Plotly.react(
      plotEl,
      [
        {
          x: xs,
          y: ys,
          type: 'scatter',
          mode: 'lines',
          line: { color: palette.brand, width: 2 },
          hovertemplate: 'S=%{x:.2f}<br>ΔNet=%{y:.4f}<extra></extra>',
          name: 'Net Delta'
        },
        {
          x: [xs[0], xs[xs.length - 1]],
          y: [0, 0],
          type: 'scatter',
          mode: 'lines',
          line: { color: palette.inkDim, width: 1, dash: 'dot' as any },
          showlegend: false,
          hoverinfo: 'skip' as any
        }
      ],
      baseLayout({
        margin: { l: 48, r: 12, t: 8, b: 36 },
        xaxis: { ...baseLayout().xaxis, title: 'Spot' },
        yaxis: { ...baseLayout().yaxis, title: 'Δ' },
        showlegend: false
      }),
      baseConfig
    );

    // Populate per-row mark and Greeks after table render.
    tbody.querySelectorAll<HTMLElement>('[data-leg-id]').forEach((row) => {
      const id = row.dataset.legId!;
      const leg = state.legs.find((l) => l.id === id);
      if (leg) updateRowMetrics(row, leg, base);
    });

    onChange();
  };

  // Wire toolbar
  el.querySelectorAll<HTMLElement>('[data-pf-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.pfAdd as LegKind;
      const base = getBase();
      const newLeg = mkLeg({
        kind,
        qty: 1,
        K: kind === 'stock' ? undefined : base.K,
        T: kind === 'stock' ? undefined : Math.max(base.T, 0.05),
        sigma: kind === 'stock' ? undefined : base.sigma,
        premium: kind === 'stock' ? base.S : Math.max(0.01, blackScholes({ ...base, type: kind === 'put' ? 'put' : 'call' }).price)
      });
      state.legs.push(newLeg);
      renderRows();
      recompute();
    });
  });
  el.querySelector('[data-pf-preset]')!.addEventListener('change', (e) => {
    const name = (e.target as HTMLSelectElement).value;
    if (!name || !PRESETS[name]) return;
    state.legs = PRESETS[name]();
    renderRows();
    recompute();
    (e.target as HTMLSelectElement).value = '';
  });
  el.querySelector('[data-pf-export]')!.addEventListener('click', () => {
    downloadJSON('portfolio.json', { base: getBase(), legs: state.legs });
  });

  renderRows();
  recompute();

  return {
    refresh: () => recompute(),
    rethemed: () => recompute()
  };
}

function rowHtml(leg: PortfolioLeg): string {
  const isStock = leg.kind === 'stock';
  return `
    <tr data-leg-id="${leg.id}" class="border-t border-slate-200 dark:border-slate-800">
      <td class="px-3 py-2">
        <select class="input mono w-24" data-field="kind">
          <option value="call" ${leg.kind === 'call' ? 'selected' : ''}>Call</option>
          <option value="put" ${leg.kind === 'put' ? 'selected' : ''}>Put</option>
          <option value="stock" ${leg.kind === 'stock' ? 'selected' : ''}>Stock</option>
        </select>
      </td>
      <td class="px-3 py-2"><input class="input mono w-20" type="number" data-field="qty" value="${leg.qty}" step="1" /></td>
      <td class="px-3 py-2"><input class="input mono w-20" type="number" data-field="multiplier" value="${leg.multiplier}" step="1" ${isStock ? 'disabled' : ''} /></td>
      <td class="px-3 py-2">${isStock ? '<span class="text-slate-400">—</span>' : `<input class="input mono w-24" type="number" data-field="K" value="${leg.K ?? ''}" step="0.5" />`}</td>
      <td class="px-3 py-2">${isStock ? '<span class="text-slate-400">—</span>' : `<input class="input mono w-20" type="number" data-field="T" value="${leg.T ?? ''}" step="0.01" />`}</td>
      <td class="px-3 py-2">${isStock ? '<span class="text-slate-400">—</span>' : `<input class="input mono w-20" type="number" data-field="sigma" value="${leg.sigma ?? ''}" step="0.01" />`}</td>
      <td class="px-3 py-2"><input class="input mono w-24" type="number" data-field="premium" value="${leg.premium}" step="0.01" /></td>
      <td class="px-3 py-2 mono" data-mark>—</td>
      <td class="px-3 py-2 mono text-xs" data-greeks>—</td>
      <td class="px-3 py-2 text-right whitespace-nowrap">
        ${isStock ? '' : '<button class="btn" data-action="iv" title="Solve implied vol from premium">IV</button>'}
        <button class="btn" data-action="remove" title="Remove">✕</button>
      </td>
    </tr>
  `;
}

// Update per-row mark/greeks after layout. Called after each table render.
function updateRowMetrics(el: HTMLElement, leg: PortfolioLeg, base: OptionInputs): void {
  const ctx = { S: base.S, r: base.r, q: base.q ?? 0 };
  const g = legGreeks(leg, ctx);
  const markEl = el.querySelector('[data-mark]') as HTMLElement;
  const greeksEl = el.querySelector('[data-greeks]') as HTMLElement;
  if (markEl) markEl.textContent = fmtMoney(g.notional);
  if (greeksEl)
    greeksEl.textContent =
      `${fmt(g.delta, 3)} · ${fmt(g.gamma, 4)} · ${fmt(g.theta, 3)} · ${fmt(g.vega, 3)} · ${fmt(g.rho, 3)}`;
}

function stat(label: string, value: string): string {
  return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value mono">${value}</div></div>`;
}

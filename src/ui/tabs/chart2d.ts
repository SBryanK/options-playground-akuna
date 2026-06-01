import Plotly, { type PlotData } from 'plotly.js-dist-min';
import {
  AXIS_LABELS,
  GREEK_LABELS,
  blackScholes,
  moneyness,
  type AxisKey,
  type GreekKey,
  type OptionInputs
} from '../../math/blackScholes';
import { computeSeries } from '../../math/series';
import { baseConfig, baseLayout, palette } from '../../utils/plotTheme';
import { downloadCSV, fmt } from '../../utils/format';

export interface Chart2DState {
  axis: AxisKey;
  greek: GreekKey;
  from: number;
  to: number;
  steps: number;
}

export function renderChart2D(s: Chart2DState): string {
  return `
    <div class="flex flex-wrap items-end gap-3 mb-4">
      ${selectField('greek', 'Greek', s.greek, GREEK_LABELS)}
      ${selectField('axis', 'X-Axis', s.axis, AXIS_LABELS)}
      ${num('from', 'From', s.from, 0.01)}
      ${num('to', 'To', s.to, 0.01)}
      ${num('steps', 'Steps', s.steps, 1)}
      <div class="ml-auto flex items-center gap-2">
        <button class="btn" data-2d-export>Export CSV</button>
      </div>
    </div>
    <div data-2d-plot class="w-full h-[440px]"></div>
    <div data-2d-stats class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3"></div>
  `;
}

function selectField<T extends string>(
  key: string,
  label: string,
  value: T,
  options: Record<T, string>
): string {
  return `
    <div class="min-w-[10rem]">
      <label class="label">${label}</label>
      <select class="input" data-2d-${key}>
        ${(Object.keys(options) as T[])
          .map((k) => `<option value="${k}" ${k === value ? 'selected' : ''}>${options[k]}</option>`)
          .join('')}
      </select>
    </div>
  `;
}

function num(key: string, label: string, value: number, step = 1): string {
  return `
    <div class="w-28">
      <label class="label">${label}</label>
      <input class="input mono" type="number" data-2d-${key} value="${value}" step="${step}" />
    </div>
  `;
}

export function mountChart2D(
  el: HTMLElement,
  getBase: () => OptionInputs,
  state: Chart2DState
): { refresh: () => void; rethemed: () => void } {
  const plotEl = el.querySelector('[data-2d-plot]') as HTMLElement;
  const statsEl = el.querySelector('[data-2d-stats]') as HTMLElement;
  let lastSeries: { x: number[]; y: number[] } = { x: [], y: [] };

  const draw = (): void => {
    const base = getBase();
    const series = computeSeries({
      base,
      axis: state.axis,
      greek: state.greek,
      from: state.from,
      to: state.to,
      steps: Math.max(2, Math.floor(state.steps))
    });
    const xs = series.map((p) => p.x);
    const ys = series.map((p) => p.y);
    lastSeries = { x: xs, y: ys };

    const trace: Partial<PlotData> = {
      x: xs,
      y: ys,
      mode: 'lines+markers',
      type: 'scatter',
      name: GREEK_LABELS[state.greek],
      line: { color: palette.brand, width: 2 },
      marker: { color: palette.brand, size: 5, symbol: 'circle-open' },
      hovertemplate:
        `${AXIS_LABELS[state.axis]}: %{x:.4f}<br>${GREEK_LABELS[state.greek]}: %{y:.6f}<extra></extra>`
    };

    // Highlight the current model point on this slice.
    const currentX = (base as any)[state.axis] as number;
    const currentY = blackScholes(base)[state.greek];
    const marker: Partial<PlotData> = {
      x: [currentX],
      y: [currentY],
      mode: 'markers',
      type: 'scatter',
      name: 'current',
      marker: { color: palette.warn, size: 11, symbol: 'diamond', line: { color: '#fff', width: 1 } },
      hovertemplate: `current → %{x:.4f}, %{y:.6f}<extra></extra>`
    };

    Plotly.react(
      plotEl,
      [trace, marker],
      baseLayout({
        xaxis: { ...baseLayout().xaxis, title: AXIS_LABELS[state.axis] },
        yaxis: { ...baseLayout().yaxis, title: GREEK_LABELS[state.greek] },
        showlegend: false
      }),
      baseConfig
    );

    renderStats(statsEl, base);
  };

  // Wire controls
  el.querySelector('[data-2d-greek]')!.addEventListener('change', (e) => {
    state.greek = (e.target as HTMLSelectElement).value as GreekKey;
    draw();
  });
  el.querySelector('[data-2d-axis]')!.addEventListener('change', (e) => {
    state.axis = (e.target as HTMLSelectElement).value as AxisKey;
    // Auto-fit a sensible range for the chosen axis.
    const range = sensibleRange(state.axis, getBase());
    state.from = range.from;
    state.to = range.to;
    (el.querySelector('[data-2d-from]') as HTMLInputElement).value = String(range.from);
    (el.querySelector('[data-2d-to]') as HTMLInputElement).value = String(range.to);
    draw();
  });
  ;['from', 'to', 'steps'].forEach((k) => {
    el.querySelector(`[data-2d-${k}]`)!.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      if (Number.isFinite(v)) {
        (state as any)[k] = v;
        draw();
      }
    });
  });
  el.querySelector('[data-2d-export]')!.addEventListener('click', () => {
    const rows: (string | number)[][] = [[AXIS_LABELS[state.axis], GREEK_LABELS[state.greek]]];
    for (let i = 0; i < lastSeries.x.length; i++) rows.push([lastSeries.x[i], lastSeries.y[i]]);
    downloadCSV(`${state.greek}-vs-${state.axis}.csv`, rows);
  });

  draw();
  return {
    refresh: draw,
    rethemed: draw
  };
}

function sensibleRange(axis: AxisKey, base: OptionInputs): { from: number; to: number } {
  switch (axis) {
    case 'S':
      return { from: Math.max(1, base.K * 0.5), to: base.K * 1.5 };
    case 'K':
      return { from: Math.max(1, base.S * 0.5), to: base.S * 1.5 };
    case 'T':
      return { from: 0.01, to: Math.max(1, base.T * 2) };
    case 'sigma':
      return { from: 0.01, to: 1 };
    case 'r':
      return { from: 0, to: 0.2 };
  }
}

function renderStats(el: HTMLElement, base: OptionInputs): void {
  const g = blackScholes(base);
  const m = moneyness(base.S, base.K);
  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-x-8 gap-y-2 justify-between">
      <div class="text-sm font-semibold">Current Option Parameters</div>
      <div class="text-xs text-slate-500 dark:text-slate-400">Spot/Strike: ${fmt(base.S / base.K, 3)} · Moneyness: ${m}</div>
    </div>
    <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      ${stat('Price', fmt(g.price, 4))}
      ${stat('Delta', fmt(g.delta, 5))}
      ${stat('Gamma', fmt(g.gamma, 5))}
      ${stat('Theta', fmt(g.theta, 5), '/yr')}
      ${stat('Vega', fmt(g.vega, 5), '/1.00σ')}
      ${stat('Rho', fmt(g.rho, 5), '/1.00r')}
    </div>
  `;
}

function stat(label: string, value: string, hint = ''): string {
  return `
    <div class="stat">
      <div class="stat-label">${label}${hint ? ` <span class="normal-case text-slate-400">${hint}</span>` : ''}</div>
      <div class="stat-value mono">${value}</div>
    </div>
  `;
}

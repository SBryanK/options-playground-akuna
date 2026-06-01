// Centralized Plotly layout themed for light/dark mode.
import type { Layout, Config } from 'plotly.js-dist-min';

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function baseLayout(extra: Partial<Layout> = {}): Partial<Layout> {
  const dark = isDark();
  const fg = dark ? '#e2e8f0' : '#0f172a';
  const muted = dark ? '#94a3b8' : '#475569';
  const grid = dark ? 'rgba(226,232,240,0.10)' : 'rgba(15,23,42,0.08)';
  const axis = {
    color: muted,
    gridcolor: grid,
    zerolinecolor: grid,
    linecolor: grid,
    tickfont: { color: muted, size: 11 },
    titlefont: { color: fg, size: 12 }
  };
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      family:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: fg,
      size: 12
    },
    margin: { l: 56, r: 24, t: 24, b: 48 },
    hoverlabel: {
      bgcolor: dark ? '#0f172a' : '#ffffff',
      bordercolor: dark ? '#334155' : '#cbd5e1',
      font: { color: fg }
    },
    legend: { font: { color: fg } },
    xaxis: axis,
    yaxis: axis,
    ...extra
  } as Partial<Layout>;
}

export const baseConfig: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'option-greeks',
    height: 720,
    width: 1280,
    scale: 2
  }
};

export const palette = {
  brand: '#6366f1',
  brand2: '#22d3ee',
  pos: '#10b981',
  neg: '#ef4444',
  warn: '#f59e0b',
  ink: '#0f172a',
  inkDim: '#94a3b8'
};

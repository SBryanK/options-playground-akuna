import Plotly, { type PlotData } from 'plotly.js-dist-min';
import {
  AXIS_LABELS,
  GREEK_LABELS,
  type AxisKey,
  type GreekKey,
  type OptionInputs
} from '../../math/blackScholes';
import { computeSurface } from '../../math/series';
import { baseConfig, baseLayout } from '../../utils/plotTheme';

export interface Chart3DState {
  xAxis: AxisKey;
  yAxis: AxisKey;
  greek: GreekKey;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  xSteps: number;
  ySteps: number;
}

export function renderChart3D(s: Chart3DState): string {
  return `
    <div class="flex flex-wrap items-end gap-3 mb-4">
      ${sel('greek', 'Greek', s.greek, GREEK_LABELS)}
      ${sel('xAxis', 'X-Axis', s.xAxis, AXIS_LABELS)}
      ${sel('yAxis', 'Y-Axis', s.yAxis, AXIS_LABELS)}
      ${num('xFrom', 'X From', s.xFrom)}
      ${num('xTo', 'X To', s.xTo)}
      ${num('yFrom', 'Y From', s.yFrom, 0.01)}
      ${num('yTo', 'Y To', s.yTo, 0.01)}
      ${num('xSteps', 'X Steps', s.xSteps, 1)}
      ${num('ySteps', 'Y Steps', s.ySteps, 1)}
    </div>
    <div data-3d-plot class="w-full h-[560px]"></div>
    <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
      Tip: drag to rotate · scroll to zoom · double-click to reset.
    </p>
  `;
}

function sel<T extends string>(key: string, label: string, value: T, opts: Record<T, string>): string {
  return `
    <div class="min-w-[10rem]">
      <label class="label">${label}</label>
      <select class="input" data-3d-${key}>
        ${(Object.keys(opts) as T[])
          .map((k) => `<option value="${k}" ${k === value ? 'selected' : ''}>${opts[k]}</option>`)
          .join('')}
      </select>
    </div>
  `;
}
function num(key: string, label: string, value: number, step = 1): string {
  return `
    <div class="w-24">
      <label class="label">${label}</label>
      <input class="input mono" type="number" data-3d-${key} value="${value}" step="${step}" />
    </div>
  `;
}

export function mountChart3D(
  el: HTMLElement,
  getBase: () => OptionInputs,
  state: Chart3DState
): { refresh: () => void; rethemed: () => void } {
  const plotEl = el.querySelector('[data-3d-plot]') as HTMLElement;

  const draw = (): void => {
    if (state.xAxis === state.yAxis) {
      plotEl.innerHTML =
        '<div class="h-full flex items-center justify-center text-sm text-slate-500">X-Axis and Y-Axis must differ.</div>';
      return;
    }
    const surf = computeSurface({
      base: getBase(),
      xAxis: state.xAxis,
      yAxis: state.yAxis,
      greek: state.greek,
      xFrom: state.xFrom,
      xTo: state.xTo,
      yFrom: state.yFrom,
      yTo: state.yTo,
      xSteps: Math.max(2, Math.floor(state.xSteps)),
      ySteps: Math.max(2, Math.floor(state.ySteps))
    });
    const data: Partial<PlotData>[] = [
      {
        type: 'surface' as any,
        x: surf.x,
        y: surf.y,
        z: surf.z,
        colorscale: 'Viridis' as any,
        showscale: true,
        contours: { z: { show: true, usecolormap: true, project: { z: true } } } as any,
        hovertemplate:
          `${AXIS_LABELS[state.xAxis]}: %{x:.3f}<br>${AXIS_LABELS[state.yAxis]}: %{y:.3f}<br>${GREEK_LABELS[state.greek]}: %{z:.5f}<extra></extra>`
      } as any
    ];
    Plotly.react(plotEl, data, {
      ...baseLayout(),
      scene: {
        xaxis: { title: AXIS_LABELS[state.xAxis] },
        yaxis: { title: AXIS_LABELS[state.yAxis] },
        zaxis: { title: GREEK_LABELS[state.greek] },
        bgcolor: 'rgba(0,0,0,0)'
      } as any,
      margin: { l: 0, r: 0, t: 8, b: 0 }
    } as any, baseConfig);
  };

  ;['greek', 'xAxis', 'yAxis'].forEach((k) => {
    el.querySelector(`[data-3d-${k}]`)!.addEventListener('change', (e) => {
      (state as any)[k] = (e.target as HTMLSelectElement).value;
      draw();
    });
  });
  ;['xFrom', 'xTo', 'yFrom', 'yTo', 'xSteps', 'ySteps'].forEach((k) => {
    el.querySelector(`[data-3d-${k}]`)!.addEventListener('input', (e) => {
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

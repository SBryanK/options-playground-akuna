import {
  blackScholes,
  type AxisKey,
  type GreekKey,
  type OptionInputs
} from './blackScholes';

export interface SeriesPoint {
  x: number;
  y: number;
}

export interface SeriesParams {
  base: OptionInputs;
  axis: AxisKey;
  greek: GreekKey;
  from: number;
  to: number;
  steps: number;
}

/** Compute (x, greek(x)) series along one axis. Vectorized in JS — fast enough for 100k pts. */
export function computeSeries(p: SeriesParams): SeriesPoint[] {
  const { base, axis, greek, from, to, steps } = p;
  const n = Math.max(2, Math.floor(steps));
  const out: SeriesPoint[] = new Array(n);
  const span = to - from;
  for (let i = 0; i < n; i++) {
    const x = from + (span * i) / (n - 1);
    const inputs: OptionInputs = { ...base };
    (inputs as any)[axis] = x;
    const g = blackScholes(inputs);
    out[i] = { x, y: g[greek] };
  }
  return out;
}

export interface SurfaceParams {
  base: OptionInputs;
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

export interface SurfaceResult {
  x: number[];
  y: number[];
  z: number[][]; // z[j][i] = greek(x[i], y[j])
}

export function computeSurface(p: SurfaceParams): SurfaceResult {
  const xN = Math.max(2, Math.floor(p.xSteps));
  const yN = Math.max(2, Math.floor(p.ySteps));
  const x = new Array<number>(xN);
  const y = new Array<number>(yN);
  for (let i = 0; i < xN; i++) x[i] = p.xFrom + ((p.xTo - p.xFrom) * i) / (xN - 1);
  for (let j = 0; j < yN; j++) y[j] = p.yFrom + ((p.yTo - p.yFrom) * j) / (yN - 1);

  const z: number[][] = new Array(yN);
  for (let j = 0; j < yN; j++) {
    const row = new Array<number>(xN);
    for (let i = 0; i < xN; i++) {
      const inputs: OptionInputs = { ...p.base };
      (inputs as any)[p.xAxis] = x[i];
      (inputs as any)[p.yAxis] = y[j];
      const g = blackScholes(inputs);
      row[i] = g[p.greek];
    }
    z[j] = row;
  }
  return { x, y, z };
}

// Ambient module declaration for plotly.js-dist-min — the package ships only JS,
// but the API mirrors plotly.js. We expose just enough surface for our usage.
declare module 'plotly.js-dist-min' {
  export interface PlotData {
    [key: string]: any;
  }
  export interface Layout {
    [key: string]: any;
  }
  export interface Config {
    [key: string]: any;
  }
  export function react(
    root: HTMLElement | string,
    data: Partial<PlotData>[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
  ): Promise<void>;
  export function newPlot(
    root: HTMLElement | string,
    data: Partial<PlotData>[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
  ): Promise<void>;
  export function purge(root: HTMLElement | string): void;
  export function relayout(root: HTMLElement | string, layout: Partial<Layout>): Promise<void>;

  const _default: {
    react: typeof react;
    newPlot: typeof newPlot;
    purge: typeof purge;
    relayout: typeof relayout;
  };
  export default _default;
}

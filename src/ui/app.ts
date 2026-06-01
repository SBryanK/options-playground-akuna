import type { OptionInputs } from '../math/blackScholes';
import type { PortfolioLeg } from '../math/portfolio';

import { renderHeader, wireHeader } from './header';
import { renderChart2D, mountChart2D, type Chart2DState } from './tabs/chart2d';
import { renderChart3D, mountChart3D, type Chart3DState } from './tabs/chart3d';
import { renderPortfolio, mountPortfolio, type PortfolioState } from './tabs/portfolio';
import { renderPnL, mountPnL, type PnLState } from './tabs/pnl';

type TabId = '2d' | '3d' | 'pnl' | 'portfolio';

interface AppState {
  tab: TabId;
  base: OptionInputs;
  chart2d: Chart2DState;
  chart3d: Chart3DState;
  pnl: PnLState;
  portfolio: PortfolioState;
}

const DEFAULT_BASE: OptionInputs = {
  type: 'call',
  S: 100,
  K: 100,
  T: 1,
  r: 0.05,
  q: 0,
  sigma: 0.2
};

export function mountApp(root: HTMLElement): void {
  const state: AppState = {
    tab: '2d',
    base: { ...DEFAULT_BASE },
    chart2d: {
      axis: 'S',
      greek: 'delta',
      from: 50,
      to: 150,
      steps: 101
    },
    chart3d: {
      xAxis: 'S',
      yAxis: 'sigma',
      greek: 'price',
      xFrom: 60,
      xTo: 140,
      yFrom: 0.05,
      yTo: 0.8,
      xSteps: 41,
      ySteps: 41
    },
    pnl: {
      fromS: 70,
      toS: 130,
      steps: 161
    },
    portfolio: {
      legs: defaultLegs()
    }
  };

  root.innerHTML = `
    ${renderHeader()}
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <section class="card p-4 sm:p-6 mb-6">
        ${renderInputs(state.base)}
      </section>

      <nav class="flex flex-wrap items-center gap-2 mb-4" id="tabs">
        ${tabBtn('2d', '2D Chart', state.tab)}
        ${tabBtn('3d', '3D Surface', state.tab)}
        ${tabBtn('pnl', 'P/L Diagram', state.tab)}
        ${tabBtn('portfolio', 'Portfolio Analysis', state.tab)}
      </nav>

      <section class="card p-4 sm:p-6">
        <div data-tab="2d" class="${state.tab === '2d' ? '' : 'hidden'}">${renderChart2D(state.chart2d)}</div>
        <div data-tab="3d" class="${state.tab === '3d' ? '' : 'hidden'}">${renderChart3D(state.chart3d)}</div>
        <div data-tab="pnl" class="${state.tab === 'pnl' ? '' : 'hidden'}">${renderPnL(state.pnl)}</div>
        <div data-tab="portfolio" class="${state.tab === 'portfolio' ? '' : 'hidden'}">${renderPortfolio(state.portfolio)}</div>
      </section>
    </main>
  `;

  wireHeader();
  wireInputs(state, root);
  wireTabs(state, root);

  // Mount each tab's interactive module.
  const c2d = mountChart2D(root.querySelector('[data-tab="2d"]') as HTMLElement, () => state.base, state.chart2d);
  const c3d = mountChart3D(root.querySelector('[data-tab="3d"]') as HTMLElement, () => state.base, state.chart3d);
  const cpl = mountPnL(root.querySelector('[data-tab="pnl"]') as HTMLElement, () => state.base, () => state.portfolio.legs, state.pnl);
  const cpf = mountPortfolio(
    root.querySelector('[data-tab="portfolio"]') as HTMLElement,
    () => state.base,
    state.portfolio,
    () => {
      cpl.refresh();
    }
  );

  // Re-render plots on theme change.
  const themeObserver = new MutationObserver(() => {
    c2d.rethemed();
    c3d.rethemed();
    cpl.rethemed();
    cpf.rethemed();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Make refresh hook available to inputs.
  (window as any).__refreshAll = () => {
    c2d.refresh();
    c3d.refresh();
    cpl.refresh();
    cpf.refresh();
  };
}

function tabBtn(id: TabId, label: string, active: TabId): string {
  return `<button class="tab ${id === active ? 'tab-active' : ''}" data-tabbtn="${id}">${label}</button>`;
}

function renderInputs(base: OptionInputs): string {
  return `
    <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h2 class="text-base font-semibold">Model Inputs</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Black-Scholes-Merton with continuous dividend yield.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label class="badge cursor-pointer">
          <input type="radio" name="opttype" value="call" ${base.type === 'call' ? 'checked' : ''} class="mr-1.5"/> Call
        </label>
        <label class="badge cursor-pointer">
          <input type="radio" name="opttype" value="put" ${base.type === 'put' ? 'checked' : ''} class="mr-1.5"/> Put
        </label>
      </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      ${numInput('S', 'Spot', base.S, 0.01)}
      ${numInput('K', 'Strike', base.K, 0.01)}
      ${numInput('sigma', 'Volatility (σ)', base.sigma, 0.01, 'e.g. 0.20 = 20%')}
      ${numInput('T', 'Time (years)', base.T, 0.01)}
      ${numInput('r', 'Risk-free Rate', base.r, 0.001, 'e.g. 0.05 = 5%')}
      ${numInput('q', 'Dividend Yield', base.q ?? 0, 0.001, 'e.g. 0.02 = 2%')}
    </div>
  `;
}

function numInput(name: string, label: string, value: number, step = 1, hint?: string): string {
  return `
    <div>
      <label class="label">${label}${hint ? ` <span class="text-slate-400 normal-case font-normal">· ${hint}</span>` : ''}</label>
      <input class="input mono" type="number" data-input="${name}" value="${value}" step="${step}" />
    </div>
  `;
}

function wireInputs(state: AppState, root: HTMLElement): void {
  root.querySelectorAll<HTMLInputElement>('[data-input]').forEach((el) => {
    el.addEventListener('input', () => {
      const key = el.dataset.input as keyof OptionInputs;
      const v = parseFloat(el.value);
      if (Number.isFinite(v)) {
        (state.base as any)[key] = v;
        (window as any).__refreshAll?.();
      }
    });
  });
  root.querySelectorAll<HTMLInputElement>('input[name="opttype"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (el.checked) {
        state.base.type = el.value as OptionInputs['type'];
        (window as any).__refreshAll?.();
      }
    });
  });
}

function wireTabs(state: AppState, root: HTMLElement): void {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tabbtn]'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('[data-tab]'));
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tabbtn as TabId;
      state.tab = id;
      buttons.forEach((b) => b.classList.toggle('tab-active', b === btn));
      panes.forEach((p) => p.classList.toggle('hidden', p.dataset.tab !== id));
      // Plotly needs a relayout when revealed from display:none.
      window.dispatchEvent(new Event('resize'));
    });
  });
}

function defaultLegs(): PortfolioLeg[] {
  // Sample: long ATM call vertical (bull call spread).
  return [
    {
      id: 'a',
      kind: 'call',
      qty: 1,
      multiplier: 100,
      K: 100,
      T: 0.25,
      sigma: 0.25,
      premium: 5.6
    },
    {
      id: 'b',
      kind: 'call',
      qty: -1,
      multiplier: 100,
      K: 110,
      T: 0.25,
      sigma: 0.25,
      premium: 1.85
    }
  ];
}

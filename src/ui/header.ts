export function renderHeader(): string {
  return `
    <header class="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/></svg>
          </span>
          <div class="leading-tight">
            <div class="text-sm font-semibold">Option Greeks Visualizer</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">Black-Scholes pricing · Greeks · Portfolio P/L</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a class="btn hidden sm:inline-flex" href="https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>
            Reference
          </a>
          <button id="themeToggle" class="btn" aria-label="Toggle theme">
            <span data-theme-icon>🌙</span>
            <span data-theme-label class="hidden sm:inline">Dark</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function wireHeader(): void {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const icon = btn.querySelector('[data-theme-icon]') as HTMLElement;
  const label = btn.querySelector('[data-theme-label]') as HTMLElement;
  const sync = (): void => {
    const dark = document.documentElement.classList.contains('dark');
    icon.textContent = dark ? '☀️' : '🌙';
    label.textContent = dark ? 'Light' : 'Dark';
  };
  sync();
  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    sync();
  });
}

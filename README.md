# Option Greeks Visualizer

An interactive options pricing & risk-visualisation tool inspired by working through Akuna Capital's *Options 101* course. Built with Vite + TypeScript + Tailwind + Plotly.

**Live demo:** deploy in one click to Vercel — see [Deploying](#deploying).

## Features

- **Black-Scholes-Merton pricing** with continuous dividend yield (`q`).
- **Six Greeks** in correct conventional units: Price, Delta, Gamma, Theta (per year), Vega (per 1.00 of vol), Rho (per 1.00 of rate).
- **2D Chart** — slice any Greek along Spot, Strike, Time, Vol, or Rate. Highlights the current model point.
- **3D Surface** — surface plot of any Greek over any two axes (e.g. Vol-Spot Vega surface).
- **P/L Diagram** — multi-leg payoff at expiry & at-now, with break-evens, max profit/loss, current spot marker.
- **Portfolio Analysis** — multi-leg editor (calls, puts, stock), aggregate Greeks, per-row mark + Greeks, **net Delta vs Spot** curve, **implied-volatility solver** (hybrid Newton-bisection), strategy presets (Bull Call Spread, Bear Put Spread, Long Straddle, Iron Condor, Covered Call, Protective Put, …).
- **Light / Dark theme**, persisted across sessions.
- **Export** — CSV for series data, JSON for full portfolios, PNG via Plotly's mode bar.
- **Zero backend.** Pure static site — every calculation runs locally in your browser.

## Math Verification

The bundled core Black-Scholes implementation reproduces the reference Delta curve `option-data.json` exactly (S=100, K=100, σ=0.2, T=1, r=0.05 → Δ ≈ 0.6368305860, matching the reference to ~10 decimal places).

## Stack

| Layer | Choice | Why |
|------|--------|-----|
| Build | Vite 5 | Fast HMR, tiny output |
| Language | TypeScript | Strict mode, no implicit any |
| Styling | Tailwind 3 | Utility-first, dark-mode aware |
| Charts | Plotly.js (dist-min) | 2D + 3D + surface + interactive |
| Math | Pure TS | No native deps — instant cold start on Vercel |

## Quick Start

```bash
# 1. Install
npm install

# 2. Dev server (auto-opens http://localhost:5173)
npm run dev

# 3. Production build
npm run build

# 4. Preview the production build
npm run preview
```

## Deploying

### Vercel (recommended, free tier)

```bash
npm i -g vercel
vercel            # link & deploy preview
vercel --prod     # production deploy
```

The included [`vercel.json`](./vercel.json) declares the framework, build command, and immutable cache headers for static assets.

### Cloudflare Pages / Netlify / GitHub Pages

Any static host works. Build command: `npm run build`. Output directory: `dist`. No environment variables required.

### Self-hosted / Docker

```bash
npm run build
npx serve dist     # or any static server (nginx, caddy, etc.)
```

## Project Layout

```
src/
  math/
    blackScholes.ts   # core pricing & Greeks (with implied-vol solver)
    series.ts         # 2D / 3D grid sampling
    portfolio.ts      # multi-leg aggregation & P/L curves
  ui/
    app.ts            # root layout, tabs, shared state
    header.ts         # top bar with theme toggle
    tabs/
      chart2d.ts      # 2D Greek-vs-axis plot
      chart3d.ts      # 3D Greek surface
      pnl.ts          # P/L diagram
      portfolio.ts    # multi-leg editor + aggregate Greeks
  utils/
    format.ts         # number/CSV/JSON formatting & download
    plotTheme.ts      # Plotly theme synced to dark mode
  types/
    plotly.d.ts       # ambient declarations for plotly.js-dist-min
  styles.css          # Tailwind layers + component classes
  main.ts             # entry — restores theme, mounts app
index.html
vite.config.ts
tailwind.config.js
postcss.config.js
tsconfig.json
vercel.json
```

## Disclaimer

Educational tool. Not financial advice. Real-world option pricing involves discrete dividends, early exercise (American style), wide-spreads, skew, and many other realities the textbook Black-Scholes-Merton model does not capture.

# Option Greeks Playground

An interactive options pricing & risk-visualization tool. Built with Vite + TypeScript + Tailwind + Plotly. Inspired by working through Akuna Capital's *Options 101* course.

## Features

- **Black-Scholes-Merton pricing** with continuous dividend yield (`q`).
- **Six Greeks** in correct conventional units: Price, Delta, Gamma, Theta (per year), Vega (per 1.00 of vol), Rho (per 1.00 of rate).
- **2D Chart** — slice any Greek along Spot, Strike, Time, Vol, or Rate. Highlights the current model point.
- **3D Surface** — surface plot of any Greek over any two axes (e.g. Vol-Spot Vega surface).
- **P/L Diagram** — multi-leg payoff at expiry & at-now, with break-evens, max profit/loss, current spot marker.
- **Portfolio Analysis** — multi-leg editor (calls, puts, stock), aggregate Greeks, per-row mark + Greeks, **net Delta vs Spot** curve, **implied-volatility solver** (hybrid Newton-bisection), and 8 strategy presets (Bull Call Spread, Bear Put Spread, Long Straddle, Iron Condor, Covered Call, Protective Put, …).
- **Light / Dark theme**, persisted across sessions.
- **Export** — CSV for series data, JSON for full portfolios, PNG via Plotly's mode bar.
- **Zero backend.** Pure static site — every calculation runs locally in your browser.

## Math Verification

The bundled core Black-Scholes implementation reproduces a reference Delta dataset *exactly* (S∈[50,150], K=100, σ=0.2, T=1, r=0.05; max error = 0 across 101 points to full double precision).

## Stack

| Layer | Choice |
|------|--------|
| Build | Vite 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind 3 |
| Charts | Plotly.js (`plotly.js-dist-min`) |
| Math | Pure TS — zero native deps |

## Quick Start

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # → dist/
npm run preview      # serve the production build
```

## Deploying

### Vercel (recommended)

```bash
npm i -g vercel
vercel --prod
```

The bundled `vercel.json` declares the framework, build command, and immutable cache headers for static assets.

### Anywhere else

`npm run build` → upload `dist/` to Netlify, Cloudflare Pages, GitHub Pages, S3, or any static host. No env vars required.

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
    format.ts         # number / CSV / JSON formatting & download
    plotTheme.ts      # Plotly theme synced to dark mode
  types/plotly.d.ts   # ambient declarations for plotly.js-dist-min
  styles.css          # Tailwind layers + component classes
  main.ts             # entry — restores theme, mounts app
```

## Branches

- `main` — this build (v1 — feature-focused workbench).
- `v2-optix` — refactored, layman-first redesign with scenario cards, plain-English insight panel, and a green/red P&L. Same advanced functionality underneath.

## Disclaimer

Educational tool. Not financial advice. Real-world options pricing involves discrete dividends, early exercise (American style), wide spreads, skew, and many other realities the textbook Black-Scholes-Merton model does not capture.

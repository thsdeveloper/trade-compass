# 🧭 Trade Compass

[![Project Status: Active](https://img.shields.io/badge/Project%20Status-Active-brightgreen.svg)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black?logo=fastify)](https://www.fastify.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-blue?logo=supabase)](https://supabase.com/)

**Trade Compass** is a comprehensive technical analysis platform specifically designed for the Brazilian financial market (B3). It provides traders with real-time-ish insights, market context analysis, and automated setup detection to facilitate better decision-making.

---

## 🚀 Key Features

- 🔐 **Secure Authentication**: End-to-end user authentication with Supabase, including traditional login/registration and **Magic Link** support.
- 📋 **Personalized Watchlists**: Monitor your favorite B3 assets in a customized view.
- 📊 **Advanced Charting**: Interactive candlestick charts with technical indicators powered by `react-financial-charts`.
- 🧠 **Market Context Analysis**: Real-time evaluation of trend, volume, and volatility.
- 🎯 **Decision Zones**: Identify high-probability zones (Favoravel/Neutra/Risco).
- ⚡ **Technical Setups**: Automated detection of popular setups:
  - Breakouts (Rompimento)
  - SMA20 Pullbacks
  - Breakdowns
  - Mystic Pulse
- 📱 **Responsive Design**: Modern UI built with Tailwind CSS and Radix UI (Shadcn/ui).

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript + React 19
- **Styling**: Tailwind CSS 4 + Shadcn/ui
- **Icons**: Lucide React

### Backend
- **Engine**: Fastify 5
- **Database / Auth**: Supabase (PostgreSQL)
- **Data Source**: BRAPI (`brapi.dev`)

### Dev & Tooling
- **Monorepo**: PNPM Workspaces
- **Testing**: Vitest + Playwright (E2E)
- **Linting**: ESLint

---

## 📁 Project Structure

```text
trade-compass/
├── back/           # Fastify backend API
├── front/          # Next.js frontend application
├── e2e/            # Playwright end-to-end tests
├── package.json    # Root workspace configuration
└── pnpm-workspace.yaml
```

---

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PNPM](https://pnpm.io/) (v8+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/trade-compass.git
   cd trade-compass
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` in both `back/` and `front/` folders.
   - Fill in your Supabase credentials and other required keys.

### Running the Project

Run both backend and frontend concurrently from the root:

```bash
pnpm dev
```

Alternatively, you can run them separately:

```bash
# Frontend only
pnpm dev:front

# Backend only
pnpm dev:back
```

---

## 🧪 Testing

```bash
# Run backend tests
pnpm test

# Run E2E tests (requires servers to be running)
pnpm exec playwright test
```

---

## 📄 License

This project is proprietary and for internal use.

---

*Built with ❤️ for the Brazilian trading community.*

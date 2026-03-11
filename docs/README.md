# CMSMasters Portal — Monorepo

Internal monorepo for the CMSMasters Portal platform. Contains the Command Center dashboard and shared packages.

## Prerequisites

- Node.js 22+
- npm 10.9+

## Setup

```bash
git clone https://github.com/Iamenzoterra/cmsmasters-portal
cd cmsmasters-portal
npm install
```

## Command Center

The Command Center (`apps/command-center`) is an internal dashboard for tracking the build progress of CMSMasters Portal. It runs on **localhost:4000**.

### Start dev server

From the monorepo root (uses Turborepo, starts all apps):

```bash
npm run dev
```

Or directly from the app directory:

```bash
cd apps/command-center
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser.

### Available scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `turbo run dev` / `next dev -p 4000` | Start development server on port 4000 |
| `build` | `turbo run build` | Production build |
| `lint` | `turbo run lint` | Run ESLint across all packages |

### CLI scripts (planned)

| Command | Description |
|---------|-------------|
| `cc:dev` | Alias for starting Command Center dev server |
| `cc:scan` | Scan monorepo and generate workplan data |
| `cc:report` | Generate progress report |

## Monorepo Structure

```
cmsmasters-portal/
├── apps/
│   └── command-center/     # Internal dashboard (Next.js 15, port 4000)
├── packages/
│   ├── ui/                 # Shared UI components
│   ├── db/                 # Database client (Supabase)
│   ├── auth/               # Auth utilities
│   ├── validators/         # Shared Zod schemas
│   └── email/              # Email templates
├── workplan/               # ADR and reference docs
├── logs/                   # Execution logs per epic
├── docs/                   # Project documentation
└── turbo.json              # Turborepo task config
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Build system:** Turborepo
- **Language:** TypeScript (strict)
- **Package manager:** npm workspaces

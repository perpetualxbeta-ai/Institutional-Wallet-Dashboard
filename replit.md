# Institutional Wallet

An institutional digital asset treasury console for reviewing balances and simulating Safe{Core} multisignature approvals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/institutional-wallet/src/App.tsx` — single-page treasury console, role switching, proposal modal, transaction queue, and local state transitions.
- `artifacts/institutional-wallet/src/lib/safe-core.ts` — Safe{Core} Protocol Kit/API Kit integration boundary plus the mock session used by the UI.
- `artifacts/institutional-wallet/src/index.css` — dark institutional finance theme, typography, grid treatment, and motion utilities.

## Architecture decisions

- The first build is mock-first: no provider, signer, private key, or wallet connection is required to exercise the UI.
- Safe{Core} SDK packages are installed behind a small adapter so real Protocol Kit/API Kit connectivity can replace the mock without rewriting dashboard components.
- Transaction proposals and signature progress live in local React state for fast UI validation; persistence is intentionally deferred.

## Product

- Admin, Signer, and Viewer role switching from the navigation bar.
- Mock ETH, USDC, and WBTC treasury balances with a total valuation.
- Pending transaction queue with signature threshold progress, simulated approval, and execution actions.
- Transfer proposal modal for Admin and Signer roles.
- Signer roster, Safe configuration summary, and a local audit log.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Safe address and all balances are mock data; the UI explicitly labels the console as simulated.
- A Signer can add one simulated signature per approval click; Admin and Viewer actions are permission-gated by the role selector.
- Use `pnpm --filter @workspace/institutional-wallet run typecheck` for the frontend check.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

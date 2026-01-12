Code Map and Conventions

Aliases
- `@/*` → project root (keep as-is)
- Prefer absolute imports from `@/src/...` for library code and `@/app/...` for routes.

Structure
- `app/` Next.js App Router routes and API handlers
- `src/components/` UI components
  - `shared/version-runs/` presentational components for Version Runs pages
- `src/shared/` cross-cutting utilities (charts, hooks, data transformers)
  - `shared/charts/` unified chart primitives; import from `@/src/shared/charts`
- `src/lib/` services, database, queries, configs
- `reports/` docs and audits

Key Flows
- Situational run single: `app/situational/[id]/run/[runId]/page.tsx` → `PerformanceGraph` → `/api/runs/[id]/buckets|metrics` and `/api/situational/[id]/run/[runId]`
- Version runs: `app/versions/[version]/runs/page.tsx` → `/api/runs/version/[version]` → `query-factory.ts`

Ownership
- DB queries: `src/lib/database-service.ts`
- Graph SQL builders: `src/lib/dashboard/graph-builders.ts`
- Query builders: `src/lib/dashboard/queries.ts` and `query-factory.ts`

Naming
- Components: kebab-cased folders; files in kebab-case where possible; exported React components in PascalCase.
- Modules/utils: kebab-case filenames; named exports preferred over default.
- Charts: import `CustomLegend`, `CustomTooltip`, formatters from `@/src/shared/charts`.



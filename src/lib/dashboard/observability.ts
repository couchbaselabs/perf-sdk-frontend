// Which observability mode a chart shows.
//
// fit-cli measures each perf run in one of two modes (`performance.observability` in its
// definition files):
// - tracing: the SDK sends OpenTelemetry traces, sampled at 0.01%. This is how every older
//   run was measured, so these runs carry no marker.
// - none: no instrumentation. fit-cli records these as `vars.observability: "none"`. Tracing
//   costs a KV workload a few percent, so the two are different datapoints and are never
//   averaged together.
//
// The standard charts exclude marked runs with `observability: null` in their vars (see
// DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING). This module switches a chart to the marked runs.
import type { DashboardInput } from '@/src/lib/dashboard/queries'

export type ObservabilityMode = 'tracing' | 'none'

export const OBSERVABILITY_MODES: readonly ObservabilityMode[] = ['tracing', 'none']

// The URL search param that carries the mode from a chart to its drilldown.
export const OBSERVABILITY_PARAM = 'observability'

// The mode named by a URL param, tracing when absent or unrecognised.
export function parseObservabilityMode(value: string | null | undefined): ObservabilityMode {
  return value === 'none' ? 'none' : 'tracing'
}

// The vars entry that selects a mode's runs. `null` excludes any run that has the key;
// "none" matches only the marked runs.
export function observabilityVar(mode: ObservabilityMode): { observability: 'none' | null } {
  return { observability: mode === 'none' ? 'none' : null }
}

// The chart for this mode's runs. A copy, so the builders' shared default vars are never
// changed.
export function withObservability<T extends Pick<DashboardInput, 'databaseCompare'>>(input: T, mode: ObservabilityMode): T {
  return {
    ...input,
    databaseCompare: {
      ...input.databaseCompare,
      vars: { ...input.databaseCompare.vars, ...observabilityVar(mode) },
    },
  }
}

// The mode a chart shows: none only if it selects the marked runs.
export function observabilityOf(input: unknown): ObservabilityMode {
  const compare = (input as { databaseCompare?: { vars?: Record<string, unknown> } } | undefined)?.databaseCompare
  return compare?.vars?.observability === 'none' ? 'none' : 'tracing'
}

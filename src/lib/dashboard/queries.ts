// Constants and query builders for dashboard operations
// Extracted from lib/dashboard-service.ts

// Default cluster setting - import from centralized config
import { DEFAULT_CLUSTER } from '@/src/lib/config/defaults'
import { LANGUAGE_MAP } from '@/src/lib/config/constants'

// EXACT Vue dashboard vars - MUST MATCH Shared.vue defaultVarsWithoutHorizontalScaling
export const DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING = {
  // driverVer increases whenever the driver logic changes in a way that would meaningfully impact results.
  "driverVer": 6,
  
  // Most tests run for this time.
  "forSeconds": 300,
  
  // performerVer is meant to change whenever the performer's code changes in a way that would meaningfully impact
  // results.  So each performer technically has its own performerVer, and it shouldn't really be useful to have it here.
  // However, in practice we usually wipe the database results instead, so this is currently 1 for all performers.
  "performerVer": 1,
  
  // Mainly affects Java - if there are multiple APIs, just use the default one.
  "api": "DEFAULT",
  
  // We usually don't want to include experiments. The value `null` here means that runs where the field "experimentName" is defined
  // should be excluded. The value that marks a field that should be excluded might change in the future
  "experimentName": null,
}

// EXACT Vue dashboard vars - MUST MATCH Shared.vue defaultVars
export const DEFAULT_QUERY_VARS = {
  ...DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING,
  
  // Most tests are done with this level of load.
  "horizontalScaling": 20
}

// EXACT Vue dashboard workload definitions - MUST MATCH Shared.vue
// Use centralized workload definitions to avoid duplication
import { 
  DEFAULT_WORKLOAD_GET, 
  DEFAULT_WORKLOAD_REPLACE, 
  DEFAULT_WORKLOAD_INSERT 
} from '@/src/lib/config/defaults'

// Re-export for backward compatibility to previous import sites
export { DEFAULT_WORKLOAD_GET, DEFAULT_WORKLOAD_REPLACE, DEFAULT_WORKLOAD_INSERT }

// Interface definitions
export interface VerticalAxisBucketsColumn {
  type: "buckets"
  column: string
  yAxisID: string
}

export interface VerticalAxisMetric {
  type: "metric"
  metric: string
  yAxisID: string
}

export interface VerticalAxisErrors {
  type: "errors"
  yAxisID: string
}

export type VerticalAxis = VerticalAxisBucketsColumn | VerticalAxisMetric | VerticalAxisErrors

export interface DatabaseCompare {
  cluster: any
  impl: any
  workload: any
  vars: any
}

export interface HorizontalAxisDynamic {
  type: string
  databaseField: string
  resultType?: string
}

export interface DashboardInput {
  hAxis: HorizontalAxisDynamic
  yAxes: VerticalAxis[]
  databaseCompare: DatabaseCompare
  graphType: string
  multipleResultsHandling: string
  mergingType: string
  trimmingSeconds: number
  excludeSnapshots: boolean
  excludeGerrit: boolean
  filterRuns: string
}

// Error summary class
export class ErrorSummary {
  constructor(public readonly exception: string, public readonly numEvents: number) {}
}

// Utility class for database field representation
// Import consolidated axis utilities
import { HorizontalAxisDynamicUtil } from './axis';

const resolveClusterVersion = (clusterVersion?: string) => {
  const normalized = clusterVersion?.trim()
  if (normalized) return normalized
  return DEFAULT_CLUSTER.version
}

const buildClusterConfig = (clusterVersion?: string) => ({
  ...DEFAULT_CLUSTER,
  version: resolveClusterVersion(clusterVersion)
})

// Input builder functions
export function createKVOperationInput(
  language: string, 
  operation: 'get' | 'replace' | 'insert',
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  metricColumn: string = "duration_average_us",
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  let workload: any
  let vars: any = DEFAULT_QUERY_VARS

  switch (operation) {
    case 'get':
      workload = DEFAULT_WORKLOAD_GET
      break
    case 'replace':
      workload = DEFAULT_WORKLOAD_REPLACE
      break
    case 'insert':
      workload = DEFAULT_WORKLOAD_INSERT
      vars = { "docNum": 10000000, ...DEFAULT_QUERY_VARS }
      break
  }

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "impl.version", 
      resultType: "VersionSemver"
    },
    yAxes: [{
      type: "buckets",
      column: metricColumn,
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      workload: workload,
      vars: vars
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average", 
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "All"
  }
}

export function createSystemMetricInput(
  language: string,
  metric: string,
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  // CRITICAL FIX: Different mergingType for each metric to match Vue exactly
  let mergingType: string
  switch (metric) {
    case "processCpu":
      mergingType = "Average"  // Vue uses Average for processCpu
      break
    case "memHeapUsedMB":
    case "memRssUsedMB": 
    case "threadCount":
      mergingType = "Maximum"  // Vue uses Maximum for memory and thread metrics
      break
    default:
      mergingType = "Maximum"  // Default fallback
  }

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "impl.version",
      resultType: "VersionSemver" 
    },
    yAxes: [{
      type: "metric",
      metric: metric,
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      workload: DEFAULT_WORKLOAD_GET,
      vars: DEFAULT_QUERY_VARS
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged", 
    mergingType: mergingType,  // Now uses correct mergingType per metric
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "All"
  }
}

export function createHorizontalScalingInput(
  language: string,
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  metricColumn: string = "duration_average_us",
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  // Omit experimentName from vars to avoid over-filtering (many runs don't set it)
  const { experimentName: _omitExpName, ...varsBase } = DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING as any

  return {
    // CRITICAL FIX: Match Vue's kvGetsHorizontalScaling - group by vars.horizontalScaling, not impl.version
    hAxis: {
      type: "dynamic",
      databaseField: "vars.horizontalScaling",
      resultType: "Integer"
    },
    yAxes: [{
      type: "buckets", 
      column: metricColumn,
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      workload: DEFAULT_WORKLOAD_GET,
      // CRITICAL FIX: Add experimentName: "horizontalScaling" to match Vue exactly
      vars: { "poolSize": 10000, ...varsBase, "experimentName": "horizontalScaling" }
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average",
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    // CRITICAL FIX: Use "Latest" filterRuns to match Vue exactly
    filterRuns: "Latest"
  }
}

// MISSING FROM NEXT.JS: Transaction query functions to match Vue's TransactionsShared.vue
export function createTransactionInput(
  language: string,
  threads: number,
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "impl.version",
      resultType: "VersionSemver"
    },
    // CRITICAL: Vue uses operations_total (throughput) for transactions, not duration_average_us
    yAxes: [{
      type: "buckets",
      column: "operations_total",
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      // CRITICAL: Vue uses special transaction workload with transaction.ops structure
      workload: {
        "operations": [{
          "transaction": {
            "ops": [{
              "op": "replace",
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }, {
              "op": "insert", 
              "docLocation": {"method": "uuid"}
            }], 
            "bounds": {"forSeconds": "$forSeconds"}
          }
        }]
      },
      // CRITICAL: Vue uses horizontalScaling: threads instead of regular vars
      vars: {
        "horizontalScaling": threads
      }
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average",
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "All"
  }
}

export function createTransactionReadOnlyInput(
  language: string,
  threads: number,
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "impl.version",
      resultType: "VersionSemver"
    },
    yAxes: [{
      type: "buckets",
      column: "duration_average_us",  // Vue uses duration for readonly transactions
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      // CRITICAL: Vue readonly transactions only do one get operation
      workload: {
        "operations": [{
          "transaction": {
            "ops": [{
              "op": "get",
              "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
            }], 
            "bounds": {"forSeconds": "$forSeconds"}
          }
        }]
      },
      vars: {
        "horizontalScaling": threads
      }
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average",
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "All"
  }
}

// MISSING FROM NEXT.JS: Reactive API query functions to match Vue's JavaClassic.vue
export function createReactiveAPIInput(
  language: string,
  apiType: 'DEFAULT' | 'ASYNC',
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "impl.version",
      resultType: "VersionSemver"
    },
    yAxes: [{
      type: "buckets",
      column: "duration_average_us",
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      workload: DEFAULT_WORKLOAD_GET,
      // CRITICAL: Vue reactive queries use different API setting and poolSize
      vars: { "poolSize": 10000, ...DEFAULT_QUERY_VARS, "api": apiType }
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average",
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "All"
  }
}

export function createHorizontalScalingReactiveInput(
  language: string,
  excludeSnapshots: boolean = false,
  excludeGerrit: boolean = true,
  clusterVersion?: string
): DashboardInput {
  const actualLanguage = LANGUAGE_MAP[language] || language
  
  // Use the same vars structure as regular horizontal scaling, but omit experimentName
  const { experimentName: _omitExpName, ...varsBase } = DEFAULT_VARS_WITHOUT_HORIZONTAL_SCALING as any

  return {
    hAxis: {
      type: "dynamic",
      databaseField: "vars.horizontalScaling",
      resultType: "Integer"
    },
    yAxes: [{
      type: "buckets",
      column: "duration_average_us",
      yAxisID: "y"
    }],
    databaseCompare: {
      cluster: buildClusterConfig(clusterVersion),
      impl: { language: actualLanguage },
      workload: DEFAULT_WORKLOAD_GET,
      // CRITICAL: Vue reactive horizontal scaling uses ASYNC API and experimentName
      vars: { 
        "poolSize": 10000, 
        ...varsBase, 
        "experimentName": "horizontalScaling",
        "api": "ASYNC"
      }
    },
    graphType: "Simplified",
    multipleResultsHandling: "Merged",
    mergingType: "Average",
    trimmingSeconds: 20,
    excludeSnapshots,
    excludeGerrit,
    filterRuns: "Latest"  // Vue uses Latest for horizontal scaling
  }
}
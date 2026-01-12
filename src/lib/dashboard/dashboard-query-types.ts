// Returns what's available filtered by display option
export class Filtered {
  clusters: Array<string>;
  workloads: Array<string>;
  impls: Array<string>;
  vars: Array<string>;

  // There are going to be too many vars and they're too workload-distinct to display all of them
  varsByWorkload: Map<string, Set<string>>;

  constructor(
    clusters: Array<string>,
    workloads: Array<string>,
    impls: Array<string>,
    vars: Array<string>,
    varsByWorkload: Map<string, Set<string>>,
  ) {
    this.clusters = clusters;
    this.workloads = workloads;
    this.impls = impls;
    this.vars = vars;
    this.varsByWorkload = varsByWorkload;
  }
}

export enum GraphType {
  // A bar chart, generally with an aggregated view of the bucketised data
  SIMPLIFIED = "Simplified",

  // A line chart, generally showing the raw bucketised data over time
  FULL = "Full"
}

// If in Simplified mode (bar chart) and we have multiple results for a particular bar, how to display them.
export enum MultipleResultsHandling {
  SIDE_BY_SIDE = "Side-by-Side",

  // How they are merged is controlled by MergingAlgorithm.
  MERGED = "Merged"
}

// If in Simplified mode (bar chart) and we have multiple results for a particular bar, and MultipleResultsHandling = MERGED,
// how do we actually merge them.
export enum MergingAlgorithm {
  AVERAGE = "Average",
  SUM = "Sum",
  MAXIMUM = "Maximum",
  MINIMUM = "Minimum"
}

// Any filtering that should be done on matched runs.
export enum FilterRuns {
  // Include all matched runs (no filtering).
  ALL = "All",

  // If the database returns results for 1.1.0, 1.1.1 and 1.1.2 for SDK A, and 3.0.3, 3.0.4 and 3.0.5 for SDK B,
  // will keep results for 1.1.2 for SDK A and 3.0.5 for SDK B.
  // It's based on the results for this particular input.  E.g. if the real current latest version of SDK A is 1.1.3,
  // will still keep results for 1.1.2.
  // Gerrit versions are automatically excluded.
  LATEST = "Latest",

  // Same as "Latest" except it will also ignore snapshot releases.
  LATEST_NON_SNAPSHOT = "LatestNonSnapshot"
}

export enum ResultType {
  // A string version number following semver ordering rules
  VERSION_SEMVER = "VersionSemver",

  INTEGER = "Integer",

  STRING = "String"
}

// This class is a little hard to explain...
//
// The original goal was that the backend and to a degree the frontend would have very little idea what specifically
// was in the json blob that are stored with each run.  The only info that was held is that the JSON contained a few
// top-level fields - "cluster", "vars", "impl" and "workload".
// Both backend and frontend would dynamically inspect and display what was in that JSON.  This would allow displaying
// many sorts of graphs - how the Java SDK performs against multiple versions of the cluster.  How the Kotlin SDK
// perf changed over various versions of that SDK.  Etc.  And all without having to have multiple endpoints for each of
// those graphs.
//
// This approach does work, to an extent.  As we try and display more complex graphs we may hit against its limits,
// which could be handled with a new HorizontalAxis type.
export interface HorizontalAxisDynamic {
  readonly type: "dynamic";

  // Can be any database field, though some fields are more likely than others to produce useful results:
  // "impl.version" - displays SDK versions.  Most useful if the query is limited with `Compare` to one SDK language.
  // "impl.language" - displays SDK languages: "Kotlin", "Scala", etc.
  // Some fields that _might_ work but haven't been used yet:
  // "cluster.version" - displays cluster versions: "7.0.0" etc.  Could be useful for seeing how an SDK's performance
  //       has changed over time vs cluster versions.
  readonly databaseField: string;

  // Gives some indication what type the results are, which helps with ordering them correctly.
  readonly resultType: ResultType
}

// Displays any at-time annotations from the run_events table for any of the runs displayed.
export interface AnnotationsRunEvents {
  readonly type: "run-events";
}

export interface VerticalAxis {
  // The ChartJS y-axis to plot this on
  yAxisID: string
}

// Allows displaying a column from the `buckets` table.
export interface VerticalAxisBucketsColumn extends VerticalAxis {
  readonly type: "buckets";

  // "latency_average_us"
  readonly column: string;
}

// Allows displaying a specific metric from the metrics table.
export interface VerticalAxisMetric extends VerticalAxis {
  readonly type: "metric";

  // "systemCPU"
  readonly metric: string;
}

// Allows displaying all available metrics for these run(s) from the metrics table.
export interface VerticalAxisMetrics extends VerticalAxis {
  readonly type: "metrics";
}

// Allows displaying errors from the `buckets` table.
export interface VerticalAxisErrors extends VerticalAxis {
  readonly type: "errors";
}

export type YAxis = VerticalAxisBucketsColumn | VerticalAxisMetric | VerticalAxisMetrics | VerticalAxisErrors;

// These fields are used for apples-to-apples comparisons.  We're very careful to only compare results that make
// sense to.  E.g. if we ran Java 3.3.4 against cluster A but Java 3.3.5 against cluster B, we don't want those to
// be appearing on the same graph.
//
// This is handled by taking these fields, which are JSON, and comparing them directly against the JSON blobs in the
// database.  The database blobs must be a superset of these input blobs.
//
// This approach allows us and the UI to be (somewhat) agnostic to what's in the database.  E.g. there's not much
// code that 'knows' we're dealing with a cluster, or variables, or whatever.  It's handled fairly generically based
// on the JSON.
export class DatabaseCompare {
  // A JSON blob containing info about the cluster that was used for this run.
  readonly cluster?: Record<string, unknown>;

  // A JSON blob containing info about the SDK that was used for this run - language, version, etc.
  readonly impl?: Record<string, unknown>;

  // A JSON blob containing info about the workload that was run - KV inserts, etc.
  readonly workload?: Record<string, unknown>;

  // A JSON blob containing the runtime variables that affected this run.  Number of docs, length of run, etc.
  readonly vars?: Record<string, unknown>;
}

// The main search class from the frontend.  There are a number of different graphs displayed and they are all
// represented through here.
export interface Input {
  // What to display on the x-axis, e.g. SDK versions.
  readonly hAxis: HorizontalAxisDynamic;

  // What to display on the y-axis, e.g. operation duration or throughput.
  // This might be more correctly named "datasets" or similar.
  readonly yAxes: Array<YAxis>;

  // What runs to look for.  This will control what ends up on h-axis.
  readonly databaseCompare: DatabaseCompare;

  // Currently the whole graph is bar (simplified) or line (full) - we can't have different yAxes (datasets) displaying
  // different graph types.
  readonly graphType: GraphType;

  // These two only apply if graphType == SIMPLIFIED
  readonly multipleResultsHandling: MultipleResultsHandling;
  readonly mergingType: MergingAlgorithm;

  // How many seconds of data to trim off the start of each run, to account for e.g. JVM warmup and general settling.
  readonly trimmingSeconds: number;

  // It's too expensive to draw large line graphs of 1 second buckets, so re-bucketise into larger buckets if this is
  // set.
  readonly bucketiseSeconds?: number;

  // Whether to exclude interim/snapshot versions ("3.4.0-20221020.123751-26")
  readonly excludeSnapshots: boolean;

  // Whether to exclude Gerrit versions ("refs/changes/19/183619/30")
  readonly excludeGerrit: boolean;

  // Whether to filter matched runs.  The default is ALL (no filtering).
  readonly filterRuns: FilterRuns;

  // Annotations are lines, labels etc. that are overlaid on the chart.  They are only supported if graphType==FULL.
  readonly annotations: Array<AnnotationsRunEvents>;
}

// Query for a single run
export interface Single {
  readonly runId: string;
  readonly yAxes: Array<YAxis>;
  readonly trimmingSeconds: number;
  readonly mergingType: MergingAlgorithm;
  readonly bucketiseSeconds?: number;
  readonly annotations: Array<AnnotationsRunEvents>;
}

export interface MetricsQuery {
  readonly language: string;
}

export class Metrics {
  // cast (metrics::json->>'threadCount' as integer) > 100
  readonly whereClause: string;
  // 'Excessive thread count, max=' || max (cast (metrics::json->>'threadCount' as integer))
  readonly message: string;

  constructor(whereClause: string, message: string) {
    this.whereClause = whereClause;
    this.message = message;
  }
}

// Getting top-level results page for a particular situational run.
export interface SituationalRunQuery {
  readonly situationalRunId: string;
}

// Getting top-level results page for a particular run inside a situational run.
export interface SituationalRunAndRunQuery {
  readonly situationalRunId: string;
  readonly runId: string;
}

export class ErrorSummary {
  readonly first: Record<string, unknown>;
  readonly count: number;

  constructor(first: Record<string, unknown>, count: number) {
    this.first = first;
    this.count = count;
  }
}

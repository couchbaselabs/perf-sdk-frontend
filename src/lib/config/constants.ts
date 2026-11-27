// Centralized constants for the performance dashboard application

// Situational runs pagination, shared by the client and the API route clamp.
export const SITUATIONAL_PAGE_SIZE = 50
export const SITUATIONAL_MAX_PAGE_SIZE = 500

// Chart operations and types
export const CORE_OPERATIONS = [
  { id: "kvGet", title: "KV Get", threads: 20, description: "" },
  { id: "kvReplace", title: "KV Replace", threads: 20, description: "" },
  { id: "kvInsert", title: "KV Insert", threads: 20, description: "" },
] as const

export const SCALING_OPERATIONS = [
  {
    id: "horizontalScaling",
    title: "Horizontal Scaling",
    description: "Tests how the SDK scales with parallelism, using KV gets. The SDK's default numKvConnections setting is used (and is likely to be a bottleneck)."
  }
] as const

export const SYSTEM_METRICS = [
  {
    id: "memory",
    title: "Memory",
    description: "Measures the maximum heap memory used in MB by the performer+SDK.",
    metric: "memHeapUsedMB",
    unit: "MB",
    subtitle: "All these tests are doing KV gets in 20 threads."
  },
  {
    id: "threadCount",
    title: "Thread Count",
    description: "Measures the maximum thread count used by the performer+SDK.",
    metric: "threadCount",
    unit: "",
    subtitle: "All these tests are doing KV gets in 20 threads."
  },
  {
    id: "processCpu",
    title: "Process CPU",
    description: "Measures the average whole-machine CPU share (0–100%, matching Java OperatingSystemMXBean.getProcessCpuLoad() * 100) used by the performer+SDK.",
    metric: "processCpu",
    unit: "%",
    subtitle: "All these tests are doing KV gets in 20 threads."
  }
] as const

export interface SdkSystemMetric {
  id: string
  title: string
  description: string
  metric: string
  unit: string
  subtitle: string
  defaultVisible?: boolean
}

export const SDK_SYSTEM_METRICS = {
  cpp: [
    {
      id: "cppProcessCpuTotal",
      title: "Process CPU (Cumulative)",
      description: "Process CPU time over wall-clock time (100% = 1 busy core). Independent of host core count.",
      metric: "processCpuTotal",
      unit: "%",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: true,
    },
    {
      id: "cppProcessCpuUser",
      title: "Process CPU (User)",
      description: "User-space CPU time over wall-clock time (100% = 1 busy core).",
      metric: "processCpuUser",
      unit: "%",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: false,
    },
    {
      id: "cppProcessCpuSys",
      title: "Process CPU (Kernel)",
      description: "Kernel-space CPU time over wall-clock time (100% = 1 busy core).",
      metric: "processCpuSys",
      unit: "%",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: false,
    },
    {
      id: "cppMaxThreadCpu",
      title: "Busiest Thread CPU",
      description: "CPU share of the single busiest thread (0–100% of 1 core).",
      metric: "maxThreadCpu",
      unit: "%",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: true,
    },
    {
      id: "cppMaxCoreCpu",
      title: "Hottest Host Core CPU",
      description: "CPU share of the busiest logical core on the host (0–100% of 1 core).",
      metric: "maxCoreCpu",
      unit: "%",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: false,
    },
    {
      id: "cppMemRssUsedMB",
      title: "RSS Memory",
      description: "Maximum resident set size (MiB) of the C++ performer process.",
      metric: "memRssUsedMB",
      unit: "MB",
      subtitle: "All these tests are doing KV gets in 20 threads.",
      defaultVisible: true,
    },
  ],
} as const satisfies Record<string, readonly SdkSystemMetric[]>

const SYSTEM_METRIC_INFO: Record<string, { label: string; unit: string }> = {
  processCpu: { label: "Process CPU", unit: "%" },
  processCpuTotal: { label: "Process CPU (Cumulative)", unit: "%" },
  processCpuUser: { label: "Process CPU (User)", unit: "%" },
  processCpuSys: { label: "Process CPU (Kernel)", unit: "%" },
  maxThreadCpu: { label: "Busiest Thread CPU", unit: "%" },
  maxCoreCpu: { label: "Hottest Host Core CPU", unit: "%" },
  systemCpu: { label: "System CPU", unit: "%" },
  systemCpuSteal: { label: "System CPU Steal", unit: "%" },
  systemCpuIoWait: { label: "System CPU I/O Wait", unit: "%" },
  logicalCpuCount: { label: "Logical CPUs", unit: "" },
  memHeapUsedMB: { label: "Heap Memory Used", unit: "MB" },
  memHeapMaxMB: { label: "Heap Memory Max", unit: "MB" },
  memDirectUsedMB: { label: "Direct Memory Used", unit: "MB" },
  memDirectMaxMB: { label: "Direct Memory Max", unit: "MB" },
  memRssUsedMB: { label: "RSS Memory Used", unit: "MB" },
  memVmsMB: { label: "VMS Memory", unit: "MB" },
  freeSwapSizeMB: { label: "Free Swap Size", unit: "MB" },
  threadCount: { label: "Thread Count", unit: "" },
  gc0AccTimeMs: { label: "GC Accumulated Time", unit: "ms" },
  gc0Count: { label: "GC Collection Count", unit: "" },
}

export function getSystemMetricInfo(
  metricKey: string | null | undefined
): { label: string; unit: string } | null {
  if (!metricKey || !Object.prototype.hasOwnProperty.call(SYSTEM_METRIC_INFO, metricKey)) {
    return null
  }
  return SYSTEM_METRIC_INFO[metricKey]
}

export const TRANSACTION_OPERATIONS = [
  {
    id: "transactionsWrite1",
    title: "Transactions (write)",
    threads: 1,
    description: "Each transaction is doing one KV replace and one KV insert.",
    subtitle: "",
    type: "write"
  },
  {
    id: "transactionsWrite20",
    title: "Transactions (write)",
    threads: 20,
    description: "Each transaction is doing one KV replace and one KV insert.",
    subtitle: "",
    type: "write"
  },
  {
    id: "transactionsReadonly1",
    title: "Transactions (readonly)",
    threads: 1,
    description: "Each transaction is doing one KV read. It should have near-identical performance to non-transactional KV gets.",
    subtitle: "",
    type: "readonly"
  },
  {
    id: "transactionsReadonly20",
    title: "Transactions (readonly)",
    threads: 20,
    description: "Each transaction is doing one KV read. It should have near-identical performance to non-transactional KV gets.",
    subtitle: "",
    type: "readonly"
  }
] as const

// API comparison operations keyed by SDK id.
// Only SDKs whose performers support an alternate API appear here.
export const SDK_API_COMPARISONS = {
  java: [
    {
      id: "horizontalScalingReactive",
      title: "Horizontal Scaling (Reactive)",
      description: "Tests how the SDK scales with parallelism, using KV gets and the reactive API."
    },
    {
      id: "kvGetsBlocking",
      title: "KV Gets (Blocking API)",
      description: "Standard blocking API performance for KV operations."
    },
    {
      id: "kvGetsReactive",
      title: "KV Gets (Reactive API)",
      description: "Reactive/Async API performance for KV operations."
    }
  ]
} as const satisfies Record<string, readonly { id: string; title: string; description: string }[]>

// Combined operations list
export const ALL_OPERATIONS = [
  ...CORE_OPERATIONS,
  ...SCALING_OPERATIONS,
  ...SYSTEM_METRICS,
  ...TRANSACTION_OPERATIONS,
] as const

// Available metrics for dynamic switching
export const AVAILABLE_METRICS = [
  // Duration metrics (from buckets)
  { id: "duration_average_us", label: "Average Duration (μs)", unit: "μs" },
  { id: "duration_min_us", label: "Min Duration (μs)", unit: "μs" },
  { id: "duration_max_us", label: "Max Duration (μs)", unit: "μs" },
  { id: "duration_p50_us", label: "P50 Duration (μs)", unit: "μs" },
  { id: "duration_p95_us", label: "P95 Duration (μs)", unit: "μs" },
  { id: "duration_p99_us", label: "P99 Duration (μs)", unit: "μs" },
  // Operations metrics (from buckets)
  { id: "operations_total", label: "Total Operations", unit: "ops" },
  { id: "operations_success", label: "Successful Operations", unit: "ops" },
  { id: "operations_failed", label: "Failed Operations", unit: "ops" },
] as const

// Language mappings
export const LANGUAGE_MAP: Record<string, string> = {
  'Java': 'Java',
  'java': 'Java',
  'Python': 'Python',
  'python': 'Python',
  'Go': 'Go',
  'go': 'Go',
  'C++': 'C++',
  'cpp': 'C++',
  '.NET': '.NET',
  'dotnet': '.NET',
  'Node.js': 'Node',
  'Node': 'Node',
  'node': 'Node',
  'nodejs': 'Node',
  'Kotlin': 'Kotlin',
  'kotlin': 'Kotlin',
  'Ruby': 'Ruby',
  'ruby': 'Ruby',
  'Scala': 'Scala',
  'scala': 'Scala',
  'Rust': 'Rust',
  'rust': 'Rust',
} as const

// Type exports for better type safety
export type CoreOperation = typeof CORE_OPERATIONS[number]
export type ScalingOperation = typeof SCALING_OPERATIONS[number]
export type SystemMetric = typeof SYSTEM_METRICS[number]
export type TransactionOperation = typeof TRANSACTION_OPERATIONS[number]
export type ApiComparisonOperation = typeof SDK_API_COMPARISONS[keyof typeof SDK_API_COMPARISONS][number]
export type Operation = typeof ALL_OPERATIONS[number]
export type AvailableMetric = typeof AVAILABLE_METRICS[number]

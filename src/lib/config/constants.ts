// Centralized constants for the performance dashboard application

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
    description: "Measures the average process CPU used by the performer+SDK, in %.",
    metric: "processCpu",
    unit: "%",
    subtitle: "All these tests are doing KV gets in 20 threads."
  }
] as const

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

export const API_COMPARISON_OPERATIONS = [
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
] as const

// Combined operations list
export const ALL_OPERATIONS = [
  ...CORE_OPERATIONS,
  ...SCALING_OPERATIONS,
  ...SYSTEM_METRICS,
  ...TRANSACTION_OPERATIONS,
  ...API_COMPARISON_OPERATIONS
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
  // System metrics - memory (reported by performers)
  // { id: "memHeapUsedMB", label: "Heap Memory Used (MB)", unit: "MB" },
  // { id: "memHeapMaxMB", label: "Heap Memory Max (MB)", unit: "MB" },
  // { id: "memDirectUsedMB", label: "Direct Memory Used (MB)", unit: "MB" },
  // { id: "memDirectMaxMB", label: "Direct Memory Max (MB)", unit: "MB" },
  // { id: "memRssUsedMB", label: "RSS Memory Used (MB)", unit: "MB" },
  // { id: "memVmsMB", label: "VMS Memory (MB)", unit: "MB" },
  // { id: "freeSwapSizeMB", label: "Free Swap Size (MB)", unit: "MB" },
  // // System metrics - CPU (reported by performers)
  // { id: "processCpu", label: "Process CPU (%)", unit: "%" },
  // { id: "systemCpu", label: "System CPU (%)", unit: "%" },
  // // System metrics - threads & GC (reported by performers)
  // { id: "threadCount", label: "Thread Count", unit: "" },
  // { id: "gc0AccTimeMs", label: "GC Accumulated Time (ms)", unit: "ms" },
  // { id: "gc0Count", label: "GC Collection Count", unit: "" },
] as const

// Language mappings
export const LANGUAGE_MAP: Record<string, string> = {
  'Java': 'Java',
  'Python': 'Python',
  'Go': 'Go',
  'C++': 'C++',
  '.NET': '.NET',
  'Node.js': 'Node',
  'Node': 'Node',
  'Kotlin': 'Kotlin',
  'Ruby': 'Ruby',
  'Scala': 'Scala',
  'Rust': 'Rust'
} as const

// Type exports for better type safety
export type CoreOperation = typeof CORE_OPERATIONS[number]
export type ScalingOperation = typeof SCALING_OPERATIONS[number]
export type SystemMetric = typeof SYSTEM_METRICS[number]
export type TransactionOperation = typeof TRANSACTION_OPERATIONS[number]
export type ApiComparisonOperation = typeof API_COMPARISON_OPERATIONS[number]
export type Operation = typeof ALL_OPERATIONS[number]
export type AvailableMetric = typeof AVAILABLE_METRICS[number]

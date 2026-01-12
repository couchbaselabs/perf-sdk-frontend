import { z } from "zod"

// Input validation schemas
export const DashboardInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  hAxis: z.object({
    type: z.enum(['dynamic']),
    databaseField: z.string(),
    title: z.string(),
  }),
  yAxes: z.array(z.object({
    type: z.enum(['buckets', 'metric', 'errors']),
    title: z.string(),
    metric: z.string().optional(),
    databaseField: z.string().optional(),
  })),
  annotations: z.array(z.object({
    type: z.string(),
  })).optional(),
})

export const KVOperationInputSchema = z.object({
  sdk: z.string(),
  operation: z.enum(['get', 'replace', 'insert']),
  excludeSnapshots: z.boolean(),
  excludeGerrit: z.boolean(),
  selectedMetric: z.string(),
})

export const SystemMetricInputSchema = z.object({
  sdk: z.string(),
  metric: z.string(),
  excludeSnapshots: z.boolean(),
  excludeGerrit: z.boolean(),
})

export const HorizontalScalingInputSchema = z.object({
  sdk: z.string(),
  excludeSnapshots: z.boolean(),
  excludeGerrit: z.boolean(),
  selectedMetric: z.string(),
})

// Output/Response validation schemas
export const RunSchema = z.object({
  id: z.string(),
  datetime: z.string(),
  status: z.string(),
  params: z.record(z.string(), z.any()),
  language: z.string().optional(),
  version: z.string().optional(),
  sdk: z.string().optional(),
  clusterVersion: z.string().optional(),
  workload: z.string().optional(),
  duration: z.number().optional(),
  metrics: z.object({
    throughput: z.number(),
    latency: z.object({
      avg: z.number(),
      min: z.number(),
      max: z.number(),
      p50: z.number(),
      p95: z.number(),
      p99: z.number(),
    }),
    operations: z.object({
      total: z.number(),
      success: z.number(),
      failed: z.number(),
    }),
    memHeapUsedMB: z.number(),
    threadCount: z.number(),
    processCpu: z.number(),
  }),
})

export const DashboardResponseSchema = z.object({
  type: z.enum(['line']),
  runs: z.array(z.object({
    id: z.string(),
    groupedBy: z.any(),
    color: z.string(),
  })),
  data: z.object({
    datasets: z.array(z.any()),
    annotations: z.record(z.string(), z.any()),
  }),
})

// Exported types for use in components
export type DashboardInput = z.infer<typeof DashboardInputSchema>
export type KVOperationInput = z.infer<typeof KVOperationInputSchema>
export type SystemMetricInput = z.infer<typeof SystemMetricInputSchema>
export type HorizontalScalingInput = z.infer<typeof HorizontalScalingInputSchema>
export type Run = z.infer<typeof RunSchema>
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>
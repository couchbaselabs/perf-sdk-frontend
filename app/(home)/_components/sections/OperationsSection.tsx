"use client"

import React from "react"
import { Badge } from "@/src/components/ui/badge"
import { BarChart4 } from "lucide-react"
import DashboardResults from "@/src/components/shared/dashboard-results"
import { getSdkVersionById } from "@/src/lib/sdk-version-service"
import {
  CORE_OPERATIONS,
  SCALING_OPERATIONS,
  SYSTEM_METRICS,
  TRANSACTION_OPERATIONS,
  API_COMPARISON_OPERATIONS
} from "@/src/lib/config/constants"
import { 
  createKVOperationInput, 
  createSystemMetricInput, 
  createHorizontalScalingInput,
  createTransactionInput,
  createTransactionReadOnlyInput,
  createReactiveAPIInput,
  createHorizontalScalingReactiveInput
} from "@/src/lib/dashboard/queries"

interface OperationsSectionProps {
  currentSdk: string;
  excludeSnapshots: boolean;
  selectedMetric: string;
  reloadTrigger: number;
  visibleOperations: string[];
  toggleOperation: (id: string) => void;
  visibleScaling: string[];
  toggleScaling: (id: string) => void;
  visibleMetrics: string[];
  toggleMetric: (id: string) => void;
  visibleTransactions: string[];
  toggleTransaction: (id: string) => void;
  visibleApiComparisons: string[];
  toggleApiComparison: (id: string) => void;
}

export default function OperationsSection({
  currentSdk,
  excludeSnapshots,
  selectedMetric,
  reloadTrigger,
  visibleOperations,
  toggleOperation,
  visibleScaling,
  toggleScaling,
  visibleMetrics,
  toggleMetric,
  visibleTransactions,
  toggleTransaction,
  visibleApiComparisons,
  toggleApiComparison,
}: OperationsSectionProps) {
  const sdkInfo = getSdkVersionById(currentSdk)

  return (
    <>
      {/* Core Operations Section */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center mr-2">
            <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm font-medium">Core Operations:</span>
          </div>
          {CORE_OPERATIONS.map((operation) => (
            <Badge
              key={operation.id}
              variant={visibleOperations.includes(operation.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleOperation(operation.id)}
            >
              {operation.title}
            </Badge>
          ))}
        </div>

        {CORE_OPERATIONS.filter((op) => visibleOperations.includes(op.id)).map((operation) => {
          const operationMap = {
            'kvGet': 'get',
            'kvReplace': 'replace',
            'kvInsert': 'insert'
          } as const

          const dashboardInput = createKVOperationInput(
            sdkInfo?.name || 'Java',
            operationMap[operation.id as keyof typeof operationMap] || 'get',
            excludeSnapshots,
            true, // excludeGerrit
            selectedMetric
          )

          return (
            <div key={operation.id} className="mb-6">
              <DashboardResults
                input={dashboardInput}
                title={`${operation.title} - ${sdkInfo?.name}`}
                description={operation.description}
                keyProp={`${operation.id}-${currentSdk}-${excludeSnapshots}`}
                selectedMetric={selectedMetric}
                threads={operation.threads}
              />
            </div>
          )
        })}
      </div>

      {/* Horizontal Scaling Section */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center mr-2">
            <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm font-medium">Horizontal Scaling:</span>
          </div>
          {SCALING_OPERATIONS.map((operation) => (
            <Badge
              key={operation.id}
              variant={visibleScaling.includes(operation.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleScaling(operation.id)}
            >
              {operation.title}
            </Badge>
          ))}
        </div>

        {SCALING_OPERATIONS.filter((op) => visibleScaling.includes(op.id)).map((operation) => {
          const dashboardInput = createHorizontalScalingInput(
            sdkInfo?.name || 'Java',
            excludeSnapshots,
            true, // excludeGerrit
            selectedMetric
          )

          return (
            <div key={operation.id} className="mb-6">
              <DashboardResults
                input={dashboardInput}
                title={`${operation.title} - ${sdkInfo?.name}`}
                description={operation.description}
                keyProp={`${operation.id}-${currentSdk}-${excludeSnapshots}-${reloadTrigger}`}
                selectedMetric={selectedMetric}
                threads={20}
              />
            </div>
          )
        })}
      </div>

      {/* System Metrics Section */}
      <div className="mb-8">
        <div className="mb-3">
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-muted-foreground">All these tests are doing KV gets in 20 threads.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center mr-2">
            <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm font-medium">System Metrics:</span>
          </div>
          {SYSTEM_METRICS.map((metric) => (
            <Badge
              key={metric.id}
              variant={visibleMetrics.includes(metric.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleMetric(metric.id)}
            >
              {metric.title}
            </Badge>
          ))}
        </div>

        {SYSTEM_METRICS.filter((op) => visibleMetrics.includes(op.id)).map((metric) => {
          const dashboardInput = createSystemMetricInput(
            sdkInfo?.name || 'Java',
            metric.metric,
            excludeSnapshots,
            true // excludeGerrit
          )

          return (
            <div key={metric.id} className="mb-6">
              <DashboardResults
                input={dashboardInput}
                title={`${metric.title} - ${sdkInfo?.name}`}
                description={metric.description}
                keyProp={`${metric.id}-${currentSdk}-${excludeSnapshots}-${reloadTrigger}`}
                selectedMetric={selectedMetric}
                threads={20}
              />
            </div>
          )
        })}
      </div>

      {/* Transactions Section */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center mr-2">
            <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm font-medium">Transactions:</span>
          </div>
          {TRANSACTION_OPERATIONS.map((operation) => (
            <Badge
              key={operation.id}
              variant={visibleTransactions.includes(operation.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTransaction(operation.id)}
            >
              {operation.title} ({operation.threads} thread{operation.threads > 1 ? 's' : ''})
            </Badge>
          ))}
        </div>

        {TRANSACTION_OPERATIONS.filter((op) => visibleTransactions.includes(op.id)).map((operation) => {
          // CRITICAL FIX: Use proper transaction query functions to match Vue exactly
          const threads = operation.id.includes('1') ? 1 : 20
          
          const dashboardInput = operation.type === 'readonly'
            ? createTransactionReadOnlyInput(
                sdkInfo?.name || 'Java',
                threads,
                excludeSnapshots,
                true // excludeGerrit
              )
            : createTransactionInput(
                sdkInfo?.name || 'Java',
                threads,
                excludeSnapshots,
                true // excludeGerrit
              )

          return (
            <div key={operation.id} className="mb-6">
              <DashboardResults
                input={dashboardInput}
                title={`${operation.title} - ${sdkInfo?.name}`}
                description={operation.description}
                keyProp={`${operation.id}-${currentSdk}-${excludeSnapshots}-${reloadTrigger}`}
                selectedMetric={selectedMetric}
                threads={operation.threads}
              />
            </div>
          )
        })}
      </div>

      {/* API Comparisons Section */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center mr-2">
            <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-sm font-medium">API Comparisons:</span>
          </div>
          {API_COMPARISON_OPERATIONS.map((operation) => (
            <Badge
              key={operation.id}
              variant={visibleApiComparisons.includes(operation.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleApiComparison(operation.id)}
            >
              {operation.title}
            </Badge>
          ))}
        </div>

        {API_COMPARISON_OPERATIONS.filter((op) => visibleApiComparisons.includes(op.id)).map((operation) => {
          // CRITICAL FIX: Use proper reactive API query functions to match Vue exactly
          let dashboardInput
          switch (operation.id) {
            case 'horizontalScalingReactive':
              // Vue uses createHorizontalScalingReactiveInput for reactive horizontal scaling
              dashboardInput = createHorizontalScalingReactiveInput(
                sdkInfo?.name || 'Java',
                excludeSnapshots,
                true // excludeGerrit
              )
              break
            case 'kvGetsBlocking':
              // Vue uses createReactiveAPIInput with DEFAULT API for blocking
              dashboardInput = createReactiveAPIInput(
                sdkInfo?.name || 'Java',
                'DEFAULT',
                excludeSnapshots,
                true // excludeGerrit
              )
              break
            case 'kvGetsReactive':
              // Vue uses createReactiveAPIInput with ASYNC API for reactive
              dashboardInput = createReactiveAPIInput(
                sdkInfo?.name || 'Java',
                'ASYNC',
                excludeSnapshots,
                true // excludeGerrit
              )
              break
            default:
              // Fallback to KV operation for unknown operations
              dashboardInput = createKVOperationInput(
                sdkInfo?.name || 'Java',
                'get',
                excludeSnapshots,
                true,
                selectedMetric
              )
          }

          return (
            <div key={operation.id} className="mb-6">
              <DashboardResults
                input={dashboardInput}
                title={`${operation.title} - ${sdkInfo?.name}`}
                description={operation.description}
                keyProp={`${operation.id}-${currentSdk}-${excludeSnapshots}-${reloadTrigger}`}
                selectedMetric={selectedMetric}
                threads={20}
              />
            </div>
          )
        })}
      </div>

      {visibleOperations.length === 0 && visibleScaling.length === 0 && visibleMetrics.length === 0 &&
        visibleTransactions.length === 0 && visibleApiComparisons.length === 0 && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8 text-center">
            <p className="text-muted-foreground">Select at least one chart type to display</p>
          </div>
        )}
    </>
  )
}
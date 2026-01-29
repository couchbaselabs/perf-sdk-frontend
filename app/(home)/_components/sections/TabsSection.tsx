"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { MetricSelectorSection } from "./MetricSelectorSection"
import OperationsSection from "./OperationsSection"

interface TabsSectionProps {
  activeTab: string
  onTabChange: (tab: string) => void
  selectedMetric: string
  onMetricChange: (metric: string) => void
  currentSdk: string
  clusterVersion: string
  excludeSnapshots: boolean
  reloadTrigger: number
  visibleOperations: string[]
  toggleOperation: (id: string) => void
  visibleScaling: string[]
  toggleScaling: (id: string) => void
  visibleMetrics: string[]
  toggleMetric: (id: string) => void
  visibleTransactions: string[]
  toggleTransaction: (id: string) => void
  visibleApiComparisons: string[]
  toggleApiComparison: (id: string) => void
  children?: React.ReactNode
}

export function TabsSection({
  activeTab,
  onTabChange,
  selectedMetric,
  onMetricChange,
  currentSdk,
  clusterVersion,
  excludeSnapshots,
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
  children
}: TabsSectionProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <TabsList className="bg-white dark:bg-slate-800">
          <TabsTrigger value="classic">Classic</TabsTrigger>
          <TabsTrigger value="couchbase">couchbase2://</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="classic" className="mt-0">
        <MetricSelectorSection 
          selectedMetric={selectedMetric}
          onMetricChange={onMetricChange}
        />
        
        <OperationsSection
          currentSdk={currentSdk}
          clusterVersion={clusterVersion}
          excludeSnapshots={excludeSnapshots}
          selectedMetric={selectedMetric}
          reloadTrigger={reloadTrigger}
          visibleOperations={visibleOperations}
          toggleOperation={toggleOperation}
          visibleScaling={visibleScaling}
          toggleScaling={toggleScaling}
          visibleMetrics={visibleMetrics}
          toggleMetric={toggleMetric}
          visibleTransactions={visibleTransactions}
          toggleTransaction={toggleTransaction}
          visibleApiComparisons={visibleApiComparisons}
          toggleApiComparison={toggleApiComparison}
        />
        
        {/* Additional sections can be added here */}
        {children}
      </TabsContent>

      <TabsContent value="couchbase">
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <p>Couchbase metrics will appear here</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="experiments">
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <p>Experiment metrics will appear here</p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
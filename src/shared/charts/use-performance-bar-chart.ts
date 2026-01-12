"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClusterVersionById } from '@/src/lib/cluster-version-service'
import { getQueryTypeFromInput } from '@/src/shared/charts/query-intent'

type UseBarChartParams = {
  title: string
  metric: string
  data?: any[]
  queryInput?: any
  clusterVersions?: string[]
  multiClusterMode?: boolean
  sdkVersion?: string
}

export function usePerformanceBarChart(params: UseBarChartParams) {
  const { title, metric, data, queryInput, clusterVersions = [], multiClusterMode = false, sdkVersion } = params

  const router = useRouter()
  const [chartType, setChartType] = useState<"standard" | "grouped">("standard")
  const [versionCache, setVersionCache] = useState<Map<string, string>>(new Map())

  const queryType = useMemo(() => getQueryTypeFromInput(queryInput, title), [queryInput, title])

  const hasMultipleClusterVersions = multiClusterMode && clusterVersions.length > 1

  const uniqueClusterVersions = useMemo(() => {
    return clusterVersions
      .map((id) => getClusterVersionById(id))
      .filter(Boolean)
      .map((v) => ({
        id: (v as any).id,
        name: (v as any).name,
        color: (v as any).color,
        key: `cluster_${(v as any).name.replace(/\./g, "_")}`,
      }))
  }, [clusterVersions])

  const processedData = useMemo(() => {
    if (!data || !multiClusterMode) return data
    if (chartType !== 'grouped') return data

    const sdkVersions = Array.from(new Set(data.map((item: any) => item.name)))
    return sdkVersions.map((sdkVersionItem) => {
      const versionItems = data.filter((item: any) => item.name === sdkVersionItem)
      const groupedItem: any = { name: sdkVersionItem }
      versionItems.forEach((item: any) => {
        const clusterKey = `cluster_${String(item.clusterName).replace(/\./g, "_")}`
        groupedItem[clusterKey] = item.value
        groupedItem[`${clusterKey}_color`] = item.clusterColor
      })
      return groupedItem
    })
  }, [data, multiClusterMode, chartType])

  const averageValue = useMemo(() => {
    if (!processedData?.length) return 0
    return processedData.reduce((sum: number, item: any) => {
      if (chartType === 'grouped') {
        let itemSum = 0
        let count = 0
        Object.keys(item).forEach((key) => {
          if (key.startsWith('cluster_') && !key.endsWith('_color')) {
            itemSum += item[key]
            count++
          }
        })
        return sum + (count ? itemSum / count : 0)
      }
      return sum + (item?.value ?? 0)
    }, 0) / processedData.length
  }, [processedData, chartType])

  const toggleChartType = () => setChartType(chartType === 'standard' ? 'grouped' : 'standard')

  const handleBarClick = async (dataPoint: any) => {
    if (!dataPoint) return
    const payload = (dataPoint as any)?.payload || dataPoint

    const isHorizontalScaling = queryType === 'horizontalScaling'
    const isSystemMetric = typeof queryType === 'object' && (queryType as any).type === 'systemMetric'
    const isTransactionGrouping = typeof queryType === 'object' && (queryType as any).type === 'transaction'
    const isReactiveAPI = queryType === 'reactiveAPI'
    const isNonVersionGrouping = isHorizontalScaling || isSystemMetric || isTransactionGrouping || isReactiveAPI

    if (Array.isArray(payload?.runIds) && payload.runIds.length > 0) {
      const uniqueRunIds = Array.from(new Set(payload.runIds.filter((id: string) => id && id.trim())))
      if (uniqueRunIds.length === 1) {
        const runId = uniqueRunIds[0]
        router.push(`/run/${encodeURIComponent(String(runId))}?metric=${encodeURIComponent(metric)}`)
        return
      } else {
        let version = payload.name
        if (isNonVersionGrouping) {
          const cacheKey = String(uniqueRunIds[0])
          const cachedVersion = versionCache.get(cacheKey)
          if (cachedVersion) {
            version = cachedVersion
          } else {
            try {
              const response = await fetch(`/api/runs/${uniqueRunIds[0]}`)
              if (response.ok) {
                const runResponse = await response.json()
                const runData = runResponse.run
                const actualVersion = runData?.params?.impl?.version || runData?.version
                if (actualVersion) {
                  version = actualVersion
                  setVersionCache(prev => new Map(prev).set(cacheKey, String(actualVersion)))
                }
              }
            } catch {}
          }
        }

        const params = new URLSearchParams()
        params.set('metric', metric)
        if (sdkVersion) params.set('sdk', sdkVersion)
        params.set('runIds', uniqueRunIds.join(','))
        if (payload.clusterVersion) params.set('cluster', payload.clusterVersion)

        if (isHorizontalScaling) params.set('horizontalScaling', payload.name)
        if (isSystemMetric && typeof queryType === 'object') params.set('systemMetric', (queryType as any).metric || 'processCpu')
        if (isTransactionGrouping && typeof queryType === 'object') params.set('transactionThreads', String((queryType as any).threads || payload.name))
        if (isReactiveAPI) params.set('reactiveAPI', 'ASYNC')

        router.push(`/versions/${encodeURIComponent(version)}/runs?${params.toString()}`)
        return
      }
    }

    if (payload?.name && /^\d+\.\d+/.test(payload.name)) {
      const version = payload.name
      const params = new URLSearchParams()
      params.set('metric', metric)
      if (sdkVersion) params.set('sdk', sdkVersion)
      if (payload.clusterVersion) params.set('cluster', payload.clusterVersion)
      if (isHorizontalScaling) params.set('horizontalScaling', payload.horizontalScaling || '20')
      if (isSystemMetric && typeof queryType === 'object') params.set('systemMetric', (queryType as any).metric || 'processCpu')
      if (isTransactionGrouping && typeof queryType === 'object') params.set('transactionThreads', String((queryType as any).threads))
      if (isReactiveAPI) params.set('reactiveAPI', 'ASYNC')
      router.push(`/versions/${encodeURIComponent(version)}/runs?${params.toString()}`)
      return
    }

    if (payload?.runId) {
      router.push(`/run/${encodeURIComponent(payload.runId)}?metric=${encodeURIComponent(metric)}`)
    }
  }

  return {
    chartType,
    toggleChartType,
    processedData,
    averageValue,
    hasMultipleClusterVersions,
    uniqueClusterVersions,
    handleBarClick,
  }
}



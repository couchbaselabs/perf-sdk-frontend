"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClusterVersionById } from '@/src/lib/cluster-version-service'
import {
  applyQueryTypeSearchParams,
  getQueryTypeFromInput,
  isNonVersionGroupingQueryType,
} from '@/src/shared/charts/query-intent'

type UseBarChartParams = {
  title: string
  metric: string
  data?: any[]
  queryInput?: any
  clusterVersions?: string[]
  multiClusterMode?: boolean
  sdkVersion?: string
}

export function resolveBarClusterVersion(
  payload: { clusterVersion?: unknown } | null | undefined,
  queryInput: { databaseCompare?: { cluster?: { version?: unknown } | null } | null } | null | undefined
): string | undefined {
  const fromPayload = typeof payload?.clusterVersion === 'string' ? payload.clusterVersion.trim() : ''
  if (fromPayload) {
    return fromPayload
  }
  const fromQuery =
    typeof queryInput?.databaseCompare?.cluster?.version === 'string'
      ? queryInput.databaseCompare.cluster.version.trim()
      : ''
  return fromQuery || undefined
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

    const isNonVersionGrouping = isNonVersionGroupingQueryType(queryType)
    const selectedCluster = resolveBarClusterVersion(payload, queryInput)

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
        if (selectedCluster) params.set('cluster', selectedCluster)
        applyQueryTypeSearchParams(
          params,
          queryType,
          payload.name != null ? String(payload.name) : undefined
        )

        router.push(`/versions/${encodeURIComponent(version)}/runs?${params.toString()}`)
        return
      }
    }

    if (payload?.name && /^\d+\.\d+/.test(payload.name)) {
      const version = payload.name
      const params = new URLSearchParams()
      params.set('metric', metric)
      if (sdkVersion) params.set('sdk', sdkVersion)
      if (selectedCluster) params.set('cluster', selectedCluster)
      applyQueryTypeSearchParams(params, queryType, String(payload.horizontalScaling || '20'))
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



import { useQuery } from '@tanstack/react-query'

export interface UsePerformanceDataResult<T = any> {
  data: T[]
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

export function usePerformanceData(runId: string): UsePerformanceDataResult<any> {
  const query = useQuery({
    queryKey: ['performanceData', runId],
    queryFn: async () => {
      if (!runId) return { buckets: [], metrics: [] }
      const [bucketsRes, metricsRes] = await Promise.all([
        fetch(`/api/runs/${runId}/buckets`, { cache: 'no-store' }),
        fetch(`/api/runs/${runId}/metrics`, { cache: 'no-store' }),
      ])

      if (!bucketsRes.ok) throw new Error(`Failed to fetch buckets: ${bucketsRes.status}`)
      const bucketsJson = await bucketsRes.json()
      if (!bucketsJson.success) throw new Error(bucketsJson.error || 'Failed to load buckets')

      const buckets = (bucketsJson.data as any[]) || []
      const metrics = metricsRes.ok ? ((await metricsRes.json()).data as any[]) || [] : []
      // Merge buckets+metrics into chart datapoints
      // Note: metrics use time_offset_secs as string, buckets use time as number
      // Metrics appear to be offset by 1 second from buckets
      const merged = buckets.map((b: any) => {
        const bucketTimeNum = Number(b.time)
        const bucketTime = Number.isFinite(bucketTimeNum) ? bucketTimeNum : 0

        // Try to find matching metric
        const m = metrics.find((mm: any) => {
          const metricTimeNum = Number(mm.time_offset_secs)
          const metricTime = Number.isFinite(metricTimeNum) ? metricTimeNum : undefined
          if (metricTime === undefined) return false
          // Metrics appear offset by <=1s sometimes
          return metricTime === bucketTime || metricTime === bucketTime + 1
        })

        const baseObj: any = {
          ...b,
          time: bucketTime,
          timeLabel: bucketTime,
        }

        if (m) {
          const { time_offset_secs, ...metricData } = m
          return { ...baseObj, ...metricData }
        }

        return baseObj
      })
      return { buckets, metrics, merged }
    },
    enabled: !!runId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  return {
    data: (query.data as any)?.merged || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: () => { void query.refetch() }
  }
}



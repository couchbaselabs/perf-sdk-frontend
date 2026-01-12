// Shared merge utilities for chart data

export function mergeBucketsAndMetrics(buckets: any[] = [], metrics: any[] = []) {
  const merged: Record<number, any> = {}

  buckets.forEach((b: any, idx: number) => {
    const tx = Number(b?.time)
    const t = Number.isFinite(tx) ? tx : idx
    if (!merged[t]) merged[t] = { time: t, timeLabel: b?.timeLabel }

    Object.keys(b || {}).forEach((key) => {
      if (key === 'time' || key === 'timeLabel') return
      const val = (b as any)[key]
      const num = Number(val)
      merged[t][key] = Number.isFinite(num) ? num : val
    })
  })

  metrics.forEach((row: any) => {
    const tnum = Number(row?.time_offset_secs)
    const t = Number.isFinite(tnum) ? tnum : 0
    if (!merged[t]) merged[t] = { time: t, timeLabel: '' }
    Object.keys(row || {}).forEach((k) => {
      if (k === 'time_offset_secs') return
      const v = (row as any)[k]
      const n = Number(v)
      merged[t][k] = Number.isFinite(n) ? n : v
    })
  })

  return Object.values(merged).sort((a: any, b: any) => (a.time || 0) - (b.time || 0))
}



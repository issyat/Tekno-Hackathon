import { weightForStation } from './weights'

export function buildEvHeatPoints(stations) {
  if (!Array.isArray(stations) || stations.length === 0) return []
  return stations
    .filter((station) => Number.isFinite(station?.lat) && Number.isFinite(station?.lng))
    .map((station) => [station.lat, station.lng, weightForStation(station)])
}

export function buildTrafficHeatPoints(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return []

  const tmjaValues = segments
    .map((segment) => Number(segment?.tmja))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)

  if (!tmjaValues.length) return []

  const quantile = (p) => {
    if (tmjaValues.length === 1) return tmjaValues[0]
    const index = Math.min(tmjaValues.length - 1, Math.round(p * (tmjaValues.length - 1)))
    return tmjaValues[index]
  }

  const range = {
    min: tmjaValues[0],
    q10: quantile(0.1),
    q25: quantile(0.25),
    q50: quantile(0.5),
    q75: quantile(0.75),
    q90: quantile(0.9),
    q97: quantile(0.97),
    max: tmjaValues[tmjaValues.length - 1],
  }

  const scale = (value, srcMin, srcMax, dstMin, dstMax) => {
    if (!Number.isFinite(value)) return dstMin
    if (srcMax - srcMin <= 1e-6) {
      return (dstMin + dstMax) / 2
    }
    const ratio = (value - srcMin) / (srcMax - srcMin)
    return dstMin + Math.min(Math.max(ratio, 0), 1) * (dstMax - dstMin)
  }

  const weightForValue = (value) => {
    if (value <= range.q10) return scale(value, range.min, range.q10, 0.05, 0.18)
    if (value <= range.q25) return scale(value, range.q10, range.q25, 0.18, 0.28)
    if (value <= range.q50) return scale(value, range.q25, range.q50, 0.28, 0.45)
    if (value <= range.q75) return scale(value, range.q50, range.q75, 0.45, 0.68)
    if (value <= range.q90) return scale(value, range.q75, range.q90, 0.68, 0.85)
    if (value <= range.q97) return scale(value, range.q90, range.q97, 0.85, 0.98)
    return scale(value, range.q97, range.max, 0.98, 1.15)
  }

  return segments
    .filter(
      (segment) =>
        Number.isFinite(segment?.lat) &&
        Number.isFinite(segment?.lng) &&
        Number.isFinite(Number(segment?.tmja)),
    )
    .map((segment) => [
      segment.lat,
      segment.lng,
      weightForValue(Number(segment.tmja)),
    ])
}

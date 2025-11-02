import { toNum } from './dataTransform'

const EARTH_RADIUS_METERS = 6371000
const DEFAULT_RADIUS_METERS = 6000

const DEFAULT_PARAMS = {
  radiusMeters: DEFAULT_RADIUS_METERS,
  alpha: 0.75,
  beta: 1.25,
  gamma: 1.2,
  delta: 1.8,
}

const clamp01 = (value) => {
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const lat1Rad = toRad(lat1)
  const lat2Rad = toRad(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}

const prepareStations = (stations) =>
  (stations || [])
    .map((station) => ({
      lat: toNum(station?.lat),
      lng: toNum(station?.lng),
      connectors: Math.max(0, toNum(station?.connectors) ?? 1),
    }))
    .filter(
      (station) =>
        Number.isFinite(station.lat) &&
        Number.isFinite(station.lng) &&
        Number.isFinite(station.connectors),
    )

const prepareSegments = (segments) =>
  (segments || [])
    .map((segment) => ({
      lat: toNum(segment?.lat),
      lng: toNum(segment?.lng),
      tmja: toNum(segment?.tmja),
      ratioPL: toNum(segment?.ratioPL),
      length_m: toNum(segment?.length_m),
    }))
    .filter(
      (segment) =>
        Number.isFinite(segment.lat) &&
        Number.isFinite(segment.lng) &&
        Number.isFinite(segment.tmja) &&
        segment.tmja > 0,
    )

const normalizeDemandValues = (values) => {
  if (!values.length) return { normalize: () => 0 }
  const logs = values.map((value) => Math.log10(value + 1))
  const min = Math.min(...logs)
  const max = Math.max(...logs)
  const range = Math.max(max - min, 1e-6)
  return {
    normalize: (value) => clamp01((Math.log10(Math.max(value, 0) + 1) - min) / range),
  }
}

const scaleRange = (value, srcMin, srcMax, dstMin, dstMax) => {
  if (!Number.isFinite(value)) return dstMin
  const span = srcMax - srcMin
  if (span <= 1e-6) return (dstMin + dstMax) / 2
  const ratio = (value - srcMin) / span
  const clamped = Math.min(Math.max(ratio, 0), 1)
  return dstMin + clamped * (dstMax - dstMin)
}

const normalizeSupplyValues = (values) => {
  if (!values.length) return { normalize: () => 0 }
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return { normalize: () => 0 }

  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? sorted[0]

  const ranges = {
    min: sorted[0],
    q10: pick(0.1),
    q25: pick(0.25),
    q50: pick(0.5),
    q75: pick(0.75),
    q90: pick(0.9),
    q97: pick(0.97),
    max: sorted[sorted.length - 1],
  }

  return {
    normalize: (value) => {
      if (!Number.isFinite(value) || value <= 0) return 0
      if (value <= ranges.q10) return scaleRange(value, ranges.min, ranges.q10, 0.02, 0.15)
      if (value <= ranges.q25) return scaleRange(value, ranges.q10, ranges.q25, 0.15, 0.3)
      if (value <= ranges.q50) return scaleRange(value, ranges.q25, ranges.q50, 0.3, 0.5)
      if (value <= ranges.q75) return scaleRange(value, ranges.q50, ranges.q75, 0.5, 0.7)
      if (value <= ranges.q90) return scaleRange(value, ranges.q75, ranges.q90, 0.7, 0.88)
      if (value <= ranges.q97) return scaleRange(value, ranges.q90, ranges.q97, 0.88, 0.95)
      return scaleRange(value, ranges.q97, ranges.max, 0.95, 1)
    },
  }
}

export function buildChargingNeedHeatPoints({
  segments,
  stations,
  radiusMeters = DEFAULT_PARAMS.radiusMeters,
  alpha = DEFAULT_PARAMS.alpha,
  beta = DEFAULT_PARAMS.beta,
  gamma = DEFAULT_PARAMS.gamma,
  delta = DEFAULT_PARAMS.delta,
} = {}) {
  const preparedStations = prepareStations(stations)
  const preparedSegments = prepareSegments(segments)

  if (!preparedStations.length || !preparedSegments.length) {
    return []
  }

  const supplyAccumulator = []
  const demandAccumulator = []
  const intermediate = []

  const latRadius = radiusMeters / 111320
  const decayLength = radiusMeters * 0.6

  for (const segment of preparedSegments) {
    const { lat, lng, tmja } = segment
    const lengthMeters = Number.isFinite(segment.length_m) ? Math.max(segment.length_m, 100) : 1000
    const lengthKm = lengthMeters / 1000
    const heavyShare = Number.isFinite(segment.ratioPL) ? Math.max(segment.ratioPL / 100, 0) : 0
    const heavyFactor = 1 + beta * heavyShare
    const demandRaw = tmja * Math.pow(Math.max(lengthKm, 0.05), alpha) * heavyFactor

    let supplyRaw = 0
    const cosLat = Math.cos((lat * Math.PI) / 180) || 1
    const lonRadius = radiusMeters / (111320 * Math.max(Math.abs(cosLat), 0.05))

    for (const station of preparedStations) {
      if (Math.abs(station.lat - lat) > latRadius) continue
      if (Math.abs(station.lng - lng) > lonRadius) continue
      const distance = haversineDistance(lat, lng, station.lat, station.lng)
      if (distance > radiusMeters) continue
      const decay = Math.exp(-distance / decayLength)
      const connectors = station.connectors > 0 ? station.connectors : 1
      supplyRaw += connectors * decay
    }

    supplyAccumulator.push(supplyRaw)
    demandAccumulator.push(demandRaw)
    intermediate.push({ lat, lng, supplyRaw, demandRaw })
  }

  const supplyNormalizer = normalizeSupplyValues(supplyAccumulator)
  const demandNormalizer = normalizeDemandValues(demandAccumulator)

  return intermediate
    .map(({ lat, lng, supplyRaw, demandRaw }) => {
      const supplyNorm = supplyNormalizer.normalize(supplyRaw)
      const demandNorm = demandNormalizer.normalize(demandRaw)
      const demandTerm = Math.pow(demandNorm, gamma)
      const scarcityTerm = Math.pow(1 - supplyNorm, delta)
      const need = clamp01(demandTerm * scarcityTerm)
      const weight = 0.35 + need * 0.85
      return { lat, lng, weight, need }
    })
    .filter(
      (entry) =>
        Number.isFinite(entry.lat) && Number.isFinite(entry.lng) && Number.isFinite(entry.weight),
    )
}

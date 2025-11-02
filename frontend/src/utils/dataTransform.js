function toNum(value) {
  const numeric = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

export function normalizeStations(raw) {
  try {
    if (raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
      return raw.features
        .filter((feature) => {
          const coords = feature?.geometry?.coordinates
          return feature?.geometry?.type === 'Point' && Array.isArray(coords)
        })
        .map((feature, index) => {
          const [lon, lat] = feature.geometry.coordinates
          const props = feature.properties || {}
          return {
            id: props.id ?? props.ref ?? index,
            name: props.name ?? props.station_name ?? props.title,
            operator: props.operator ?? props.network,
            address: props.address ?? props.addr_full ?? props.street,
            lat: Number(lat),
            lng: Number(lon),
            connectors: toNum(
              props.number_connectors ??
                props.connectors ??
                props.connector_count ??
                props.num_points,
            ),
            estimatedPowerKw: toNum(props.power_kw ?? props.total_power_kw ?? props.estimated_power_kw),
          }
        })
        .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
    }

    if (Array.isArray(raw)) {
      return raw
        .map((entry, index) => {
          const pairs = Object.entries(entry || {}).map(([key, value]) => [key.toLowerCase(), value])
          const lower = Object.fromEntries(pairs)
          return {
            id: entry?.id ?? entry?.ref ?? index,
            name: entry?.name ?? entry?.station_name ?? entry?.title,
            operator: entry?.operator ?? entry?.network,
            address: entry?.address ?? entry?.addr_full ?? entry?.street,
            lat: toNum(lower.lat ?? lower.latitude ?? lower.y),
            lng: toNum(lower.lng ?? lower.lon ?? lower.longitude ?? lower.x),
            connectors: toNum(
              entry?.number_connectors ??
                entry?.connectors ??
                entry?.connector_count ??
                entry?.num_points ??
                entry?.plugs,
            ),
            estimatedPowerKw: toNum(
              entry?.estimated_power_kw ??
                entry?.power_kw ??
                entry?.total_power_kw ??
                entry?.puissance_installee_kw,
            ),
          }
        })
        .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
    }
  } catch (error) {
    console.warn('normalizeStations failed', error)
  }

  return []
}

export function normalizeTrafficSegments(raw) {
  try {
    if (Array.isArray(raw)) {
      return raw
        .map((entry, index) => {
          const lat = toNum(entry?.lat ?? entry?.latitude)
          const lng = toNum(entry?.lng ?? entry?.lon ?? entry?.longitude)
          return {
            id: entry?.id ?? `${entry?.route ?? 'segment'}-${index}`,
            route: entry?.route,
            annee: entry?.annee,
            type: entry?.type,
            tmja: toNum(entry?.tmja),
            ratioPL: toNum(entry?.ratioPL),
            length_m: toNum(entry?.length_m),
            pr_start: toNum(entry?.pr_start ?? entry?.prD),
            pr_end: toNum(entry?.pr_end ?? entry?.prF),
            lat,
            lng,
          }
        })
        .filter(
          (segment) =>
            Number.isFinite(segment.lat) &&
            Number.isFinite(segment.lng) &&
            Number.isFinite(segment.tmja),
        )
    }
  } catch (error) {
    console.warn('normalizeTrafficSegments failed', error)
  }

  return []
}

export { toNum }

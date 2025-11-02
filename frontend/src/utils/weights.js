export function weightForStation(station) {
  const raw =
    station.connectors ??
    station.number_connectors ??
    station.num_connectors ??
    station.plugs ??
    1
  const connectors = Number(raw)
  if (!Number.isFinite(connectors)) return 0.6
  const scaled = connectors / 6
  return Math.max(0.35, Math.min(1.2, scaled))
}

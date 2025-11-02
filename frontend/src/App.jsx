import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import './leaflet-setup'
import L from 'leaflet'
import 'leaflet.heat'

function TopBar({ onSearch }) {
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    onSearch(q.trim())
  }
  return (
    <header className="topbar">
      <div className="brand">Tekno Map</div>
      <form className="search" onSubmit={submit} role="search">
        <input
          type="search"
          placeholder="Search a place..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search places"
        />
        <button type="submit">Search</button>
      </form>
    </header>
  )
}

export default function App() {
  const mapRef = useRef(null)
  const [center, setCenter] = useState([48.8566, 2.3522]) // Paris as default
  const [zoom, setZoom] = useState(12)
  const [evStations, setEvStations] = useState([])
  const [trafficTiles, setTrafficTiles] = useState([])
  const [activeLayer, setActiveLayer] = useState('ev')

  // Ensure Leaflet knows the container's real size after layout
  useEffect(() => {
    const invalidate = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
    }
    // next tick for initial mount
    const t = setTimeout(invalidate, 0)
    window.addEventListener('resize', invalidate)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', invalidate)
    }
  }, [])

  // Load EV stations from public data (works in dev and build)
  useEffect(() => {
    const url = '/data/merged_ev_stations.json'
    fetch(url)
      .then((r) => r.json())
      .then((raw) => {
        const norm = normalizeStations(raw)
        setEvStations(norm)
      })
      .catch((e) => console.error('Failed to load merged_ev_stations.json', e))
  }, [])

  // Load traffic congestion tiles
  useEffect(() => {
    const url = '/data/2025-11-01T22_55_39.606Z.geojson'
    fetch(url)
      .then((r) => r.json())
      .then((raw) => {
        const norm = normalizeTrafficTiles(raw)
        setTrafficTiles(norm)
      })
      .catch((e) => console.error('Failed to load congestion geojson', e))
  }, [])

  const handleSearch = useCallback(async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const next = [parseFloat(lat), parseFloat(lon)]
        setCenter(next)
        // fly if map is ready
        if (mapRef.current) {
          mapRef.current.invalidateSize()
          mapRef.current.flyTo(next, 14, { duration: 1.25 })
        } else {
          setZoom(14)
        }
        console.info('Found:', display_name)
      } else {
        alert('No results found')
      }
    } catch (err) {
      console.error(err)
      alert('Search failed. Please try again.')
    }
  }, [])

  const evHeatPoints = useMemo(() => {
    if (!evStations.length) return []
    return evStations
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => [s.lat, s.lng, weightForStation(s)])
  }, [evStations])

  const trafficHeatPoints = useMemo(() => {
    if (!trafficTiles.length) return []
    return trafficTiles
      .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
      .map((t) => [t.lat, t.lng, weightForCongestion(t)])
  }, [trafficTiles])

  const activeHeatPoints = activeLayer === 'ev' ? evHeatPoints : trafficHeatPoints
  const activeGradient = activeLayer === 'ev' ? gradients.ev : gradients.traffic

  return (
    <div className="page">
      <TopBar onSearch={handleSearch} />
      <main className="bento">
        <section className="card map-card">
          <LayerToggle active={activeLayer} onChange={setActiveLayer} />
          <MapContainer
            center={center}
            zoom={zoom}
            whenCreated={(map) => (mapRef.current = map)}
            preferCanvas
            className="map"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <HeatmapLayer points={activeHeatPoints} gradient={activeGradient} />
          </MapContainer>
        </section>
        {/* Future bento cards can go here */}
      </main>
    </div>
  )
}

function HeatmapLayer({ points, gradient }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map) return

    if (layerRef.current) {
      layerRef.current.remove()
      layerRef.current = null
    }

    if (!points.length) return

    const layer = L.heatLayer(points, {
      radius: 26,
      blur: 18,
      maxZoom: 15,
      minOpacity: 0.25,
      gradient,
    }).addTo(map)

    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        layerRef.current.remove()
        layerRef.current = null
      }
    }
  }, [map, points, gradient])

  return null
}

function LayerToggle({ active, onChange }) {
  return (
    <div className="layer-toggle" role="group" aria-label="Layer selection">
      <button
        type="button"
        aria-pressed={active === 'ev'}
        onClick={() => onChange('ev')}
      >
        EV Charging
      </button>
      <button
        type="button"
        aria-pressed={active === 'traffic'}
        onClick={() => onChange('traffic')}
      >
        Traffic
      </button>
    </div>
  )
}

const gradients = {
  ev: {
    0.0: '#22d3ee',
    0.4: '#38bdf8',
    0.7: '#f97316',
    1.0: '#ef4444',
  },
  traffic: {
    0.0: '#bbf7d0',
    0.4: '#86efac',
    0.7: '#22c55e',
    1.0: '#15803d',
  },
}

// --- helpers ---
function weightForStation(station) {
  const raw =
    station.connectors ??
    station.number_connectors ??
    station.num_connectors ??
    station.plugs ??
    1
  const connectors = Number(raw)
  if (!Number.isFinite(connectors)) return 0.6
  // Normalize count roughly into [0.4, 1.2]
  const scaled = connectors / 6
  return Math.max(0.35, Math.min(1.2, scaled))
}

function normalizeStations(raw) {
  try {
    // GeoJSON FeatureCollection
    if (raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
      return raw.features
        .filter((f) => f?.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates))
        .map((f, idx) => {
          const [lon, lat] = f.geometry.coordinates
          const props = f.properties || {}
          return {
            id: props.id ?? props.ref ?? idx,
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
          }
        })
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    }

    // Array of objects with lat/lon-like fields
    if (Array.isArray(raw)) {
      return raw
        .map((o, idx) => {
          const lower = Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.toLowerCase(), v]))
          const lat = toNum(lower.lat ?? lower.latitude ?? lower.y)
          const lng = toNum(lower.lng ?? lower.lon ?? lower.longitude ?? lower.x)
          return {
            id: o.id ?? o.ref ?? idx,
            name: o.name ?? o.station_name ?? o.title,
            operator: o.operator ?? o.network,
            address: o.address ?? o.addr_full ?? o.street,
            lat,
            lng,
            connectors: toNum(
              o.number_connectors ??
                o.connectors ??
                o.connector_count ??
                o.num_points ??
                o.plugs,
            ),
          }
        })
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    }
  } catch (e) {
    console.warn('normalizeStations failed', e)
  }
  return []
}

function normalizeTrafficTiles(raw) {
  try {
    if (raw && raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
      return raw.features.flatMap((feature, featIdx) => {
        const tiles = feature?.properties?.tiledData?.tiles
        if (!Array.isArray(tiles)) return []
        return tiles
          .map((tile, tileIdx) => {
            const lat = toNum(tile.lat ?? tile.latitude ?? tile.y)
            const lng = toNum(tile.lon ?? tile.lng ?? tile.longitude ?? tile.x)
            const intensity = toNum(tile.c ?? tile.value ?? tile.intensity)
            return {
              id: `${feature.id ?? featIdx}-${tileIdx}`,
              lat,
              lng,
              intensity,
            }
          })
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.intensity))
      })
    }
  } catch (e) {
    console.warn('normalizeTrafficTiles failed', e)
  }
  return []
}

function weightForCongestion(point) {
  const intensity = Number(point.intensity)
  if (!Number.isFinite(intensity)) return 0.5
  const scaled = intensity / 40
  return Math.max(0.25, Math.min(1.1, scaled))
}

function toNum(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : undefined
}

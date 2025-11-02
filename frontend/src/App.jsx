import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import './leaflet-setup'

import { HeatmapLayer } from './components/HeatmapLayer'
import { LayerToggle } from './components/LayerToggle'
import { NeedThresholdControl } from './components/NeedThresholdControl'
import { PowerThresholdControl } from './components/PowerThresholdControl'
import { TopBar } from './components/TopBar'
import { gradients, layerDefinitions } from './constants/layers'
import { useEvStations } from './hooks/useEvStations'
import { useTrafficSegments } from './hooks/useTrafficSegments'
import { buildEvHeatPoints, buildTrafficHeatPoints } from './utils/heatmap'
import { buildChargingNeedHeatPoints } from './utils/chargingNeed'

export default function App() {
  const mapRef = useRef(null)
  const [center, setCenter] = useState([48.8566, 2.3522]) // Paris as default
  const [zoom, setZoom] = useState(12)
  const [visibleLayers, setVisibleLayers] = useState(() =>
    Object.fromEntries(
      layerDefinitions.map(({ key, defaultVisible }) => [key, Boolean(defaultVisible)]),
    ),
  )
  const [needSliderValue, setNeedSliderValue] = useState(40)
  const [powerSliderValue, setPowerSliderValue] = useState(3)

  const evStations = useEvStations()
  const trafficSegments = useTrafficSegments()

  useEffect(() => {
    const invalidate = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
    }

    const timeout = setTimeout(invalidate, 0)
    window.addEventListener('resize', invalidate)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', invalidate)
    }
  }, [])

  const toggleLayer = useCallback((layerKey) => {
    setVisibleLayers((previous) => ({
      ...previous,
      [layerKey]: !previous[layerKey],
    }))
  }, [])

  const handleSearch = useCallback(async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name: name } = data[0]
        const next = [parseFloat(lat), parseFloat(lon)]
        setCenter(next)
        if (mapRef.current) {
          mapRef.current.invalidateSize()
          mapRef.current.flyTo(next, 14, { duration: 1.25 })
        } else {
          setZoom(14)
        }
        console.info('Found:', name)
      } else {
        alert('No results found')
      }
    } catch (error) {
      console.error(error)
      alert('Search failed. Please try again.')
    }
  }, [])

  const filteredEvStations = useMemo(() => {
    if (!evStations.length) return []
    if (!Number.isFinite(powerSliderValue) || powerSliderValue <= 3) {
      return evStations
    }
    const minKw = powerSliderValue
    return evStations.filter((station) => {
      const power = Number(station.estimatedPowerKw ?? station.power_kw ?? station.kw)
      if (Number.isFinite(power)) {
        return power >= minKw
      }
      const connectors = Number(station.connectors)
      if (Number.isFinite(connectors)) {
        return connectors * 22 >= minKw
      }
      return true
    })
  }, [evStations, powerSliderValue])

  const evHeatPoints = useMemo(() => buildEvHeatPoints(filteredEvStations), [filteredEvStations])
  const trafficHeatPoints = useMemo(
    () => buildTrafficHeatPoints(trafficSegments),
    [trafficSegments],
  )
  const chargingNeedPoints = useMemo(
    () =>
      buildChargingNeedHeatPoints({
        segments: trafficSegments,
        stations: evStations,
      }),
    [trafficSegments, evStations],
  )
  const chargingNeedHeatPoints = useMemo(() => {
    if (!chargingNeedPoints.length) return []
    const threshold = needSliderValue / 100
    return chargingNeedPoints
      .filter((point) => point.need >= threshold)
      .map((point) => [point.lat, point.lng, point.weight])
  }, [chargingNeedPoints, needSliderValue])

  const handleNeedSliderChange = useCallback((next) => {
    setNeedSliderValue(next)
  }, [])
  const handlePowerSliderChange = useCallback((next) => {
    setPowerSliderValue(next)
  }, [])

  return (
    <div className="page">
      <TopBar onSearch={handleSearch} />
      <main className="bento">
        <section className="card map-card">
          <LayerToggle visible={visibleLayers} onToggle={toggleLayer} layers={layerDefinitions} />
          <NeedThresholdControl
            value={needSliderValue}
            onChange={handleNeedSliderChange}
            disabled={!visibleLayers.chargingNeed}
          />
          <PowerThresholdControl
            value={powerSliderValue}
            onChange={handlePowerSliderChange}
            disabled={!visibleLayers.ev}
          />
          <MapContainer
            center={center}
            zoom={zoom}
            whenCreated={(map) => (mapRef.current = map)}
            preferCanvas
            className="map"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visibleLayers.ev && evHeatPoints.length > 0 && (
              <HeatmapLayer
                key="ev-heat"
                points={evHeatPoints}
                gradient={gradients.ev}
                radius={24}
                blur={18}
                maxZoom={15}
              />
            )}
            {visibleLayers.traffic && trafficHeatPoints.length > 0 && (
              <HeatmapLayer
                key="traffic-heat"
                points={trafficHeatPoints}
                gradient={gradients.traffic}
                radius={26}
                blur={18}
                maxZoom={13}
                minOpacity={0.12}
                maxIntensity={1.05}
              />
            )}
            {visibleLayers.chargingNeed && chargingNeedHeatPoints.length > 0 && (
              <HeatmapLayer
                key="charging-need-heat"
                points={chargingNeedHeatPoints}
                gradient={gradients.chargingNeed}
                radius={30}
                blur={22}
                maxZoom={12}
                minOpacity={0.2}
                maxIntensity={1.1}
              />
            )}
          </MapContainer>
        </section>
      </main>
    </div>
  )
}

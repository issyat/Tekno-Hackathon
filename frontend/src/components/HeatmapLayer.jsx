import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export function HeatmapLayer({
  points,
  gradient,
  radius = 26,
  blur = 18,
  maxZoom = 15,
  minOpacity = 0.25,
  maxIntensity = 1,
}) {
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
      radius,
      blur,
      maxZoom,
      minOpacity,
      max: maxIntensity,
      gradient,
    }).addTo(map)

    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        layerRef.current.remove()
        layerRef.current = null
      }
    }
  }, [map, points, gradient, radius, blur, maxZoom, minOpacity, maxIntensity])

  return null
}

import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { CircleMarker, LayerGroup, Pane, useMap } from 'react-leaflet'

/**
 * Invisible interactive markers overlay that sits on top of the heatmap, used to
 * provide pointer cursor and click interactions for areas with high charging need.
 */
export default function ChargingNeedOverlay({ points, threshold = 0.4, onSelect }) {
  const map = useMap()

  const interactivePoints = useMemo(() => {
    if (!Array.isArray(points)) return []
    return points.filter((p) => Number.isFinite(p?.need) && p.need >= threshold)
  }, [points, threshold])

  const handleMouseOver = () => {
    const c = map?.getContainer?.()
    if (c) c.style.cursor = 'pointer'
  }

  const handleMouseOut = () => {
    const c = map?.getContainer?.()
    if (c) c.style.cursor = ''
  }

  return (
    <Pane name="charging-need-overlay" style={{ zIndex: 650 }}>
      <LayerGroup>
        {interactivePoints.map((p, idx) => (
          <CircleMarker
            key={`${p.lat},${p.lng},${idx}`}
            center={[p.lat, p.lng]}
            radius={18}
            pathOptions={{ color: 'transparent', fillColor: 'transparent', fillOpacity: 0, opacity: 0 }}
            eventHandlers={{
              mouseover: handleMouseOver,
              mouseout: handleMouseOut,
              click: () => onSelect?.(p),
            }}
            bubblingMouseEvents={false}
          />
        ))}
      </LayerGroup>
    </Pane>
  )
}

ChargingNeedOverlay.propTypes = {
  points: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      need: PropTypes.number,
      weight: PropTypes.number,
    }),
  ),
  threshold: PropTypes.number,
  onSelect: PropTypes.func,
}

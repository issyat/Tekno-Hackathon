import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'

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

  return (
    <div className="page">
      <TopBar onSearch={handleSearch} />
      <main className="bento">
        <section className="card map-card">
          <MapContainer
            center={center}
            zoom={zoom}
            whenCreated={(map) => (mapRef.current = map)}
            className="map"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </MapContainer>
        </section>
        {/* Future bento cards can go here */}
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { normalizeStations } from '../utils/dataTransform'

const DEFAULT_URL = '/data/merged_ev_stations.json'

export function useEvStations(url = DEFAULT_URL) {
  const [stations, setStations] = useState([])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch(url)
        const payload = await response.json()
        if (!active) return
        setStations(normalizeStations(payload))
      } catch (error) {
        console.error('Failed to load merged_ev_stations.json', error)
        if (active) {
          setStations([])
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [url])

  return stations
}

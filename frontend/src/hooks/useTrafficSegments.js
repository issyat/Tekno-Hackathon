import { useEffect, useState } from 'react'
import { normalizeTrafficSegments } from '../utils/dataTransform'

const DEFAULT_URL = '/data/tmja-rrnc-2024.json'

export function useTrafficSegments(url = DEFAULT_URL) {
  const [segments, setSegments] = useState([])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch(url)
        const payload = await response.json()
        if (!active) return
        setSegments(normalizeTrafficSegments(payload))
      } catch (error) {
        console.error('Failed to load traffic dataset', error)
        if (active) {
          setSegments([])
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [url])

  return segments
}

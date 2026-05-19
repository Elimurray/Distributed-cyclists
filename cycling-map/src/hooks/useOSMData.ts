import { useEffect, useState } from 'react'
import { fetchCyclingData } from '../osm/overpass'
import { BoundingBox, OSMElement } from '../types/osm'

interface OSMState {
  elements: OSMElement[]
  loading: boolean
  error: string | null
}

export function useOSMData(bounds: BoundingBox): OSMState {
  const [state, setState] = useState<OSMState>({ elements: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    fetchCyclingData(bounds)
      .then(data => {
        if (!cancelled) setState({ elements: data.elements, loading: false, error: null })
      })
      .catch(err => {
        if (!cancelled) setState({ elements: [], loading: false, error: String(err) })
      })

    return () => { cancelled = true }
  }, [bounds.north, bounds.south, bounds.east, bounds.west])

  return state
}

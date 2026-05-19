import AsyncStorage from '@react-native-async-storage/async-storage'
import { BoundingBox, OverpassResponse } from '../types/osm'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export function buildCyclingQuery(bounds: BoundingBox): string {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`

  return `[out:json][timeout:30];(way["highway"="cycleway"](${bbox});way["cycleway"="lane"](${bbox});way["cycleway"="track"](${bbox});way["cycleway"="shared_lane"](${bbox});way["bicycle"="designated"](${bbox});node["amenity"="bicycle_parking"](${bbox});node["amenity"="bicycle_repair_station"](${bbox}););out body geom;`
}

function cacheKey(bounds: BoundingBox): string {
  return `osm_cache_${bounds.south}_${bounds.west}_${bounds.north}_${bounds.east}`
}

interface CachedData {
  fetchedAt: number
  data: OverpassResponse
}

async function postToEndpoint(url: string, query: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
}

export async function fetchCyclingData(bounds: BoundingBox): Promise<OverpassResponse> {
  const key = cacheKey(bounds)

  const cached = await AsyncStorage.getItem(key)
  if (cached) {
    const parsed: CachedData = JSON.parse(cached)
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
      console.log('[OSM] Returning cached data')
      return parsed.data
    }
  }

  const query = buildCyclingQuery(bounds)
  let lastError: string = 'No endpoints tried'

  for (const url of ENDPOINTS) {
    try {
      const response = await postToEndpoint(url, query)
      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${url}`
        console.warn(`[OSM] ${lastError}`)
        continue
      }
      const data: OverpassResponse = await response.json()
      console.log(`[OSM] Fetched ${data.elements.length} elements from ${url}`)
      await AsyncStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), data }))
      return data
    } catch (err) {
      lastError = `Network error from ${url}: ${err}`
      console.warn(`[OSM] ${lastError}`)
    }
  }

  throw new Error(lastError)
}

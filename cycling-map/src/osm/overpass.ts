import AsyncStorage from '@react-native-async-storage/async-storage'
import { BoundingBox, OverpassResponse } from '../types/osm'
import { logNonFatal } from '../debug/errorLog'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

// Overpass instances reject clients that don't identify themselves: overpass-api.de
// answers 406 to OkHttp's default header, which is exactly what React Native's fetch
// sends on Android, so every request from the app was being refused before it ran.
// Identifying the app is also what the Overpass usage policy asks for.
const USER_AGENT = 'CyclingMap/1.0 (University of Waikato ENGEN582 research project)'

// Public Overpass instances are slow and frequently return 504 under load, so one pass
// over the endpoints isn't enough to conclude the data is unreachable.
const MAX_ATTEMPTS = 2

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

// Must exceed the [timeout:30] the query itself grants the server, otherwise we abort a
// request the server is still legitimately working on and report it as a network error.
const REQUEST_TIMEOUT_MS = 35_000

async function postToEndpoint(url: string, query: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function readCache(key: string): Promise<CachedData | null> {
  try {
    const cached = await AsyncStorage.getItem(key)
    return cached ? (JSON.parse(cached) as CachedData) : null
  } catch (err) {
    console.warn('[OSM] failed to read cache', err)
    return null
  }
}

export async function fetchCyclingData(bounds: BoundingBox): Promise<OverpassResponse> {
  const key = cacheKey(bounds)

  const cached = await readCache(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log('[OSM] Returning cached data')
    return cached.data
  }

  const query = buildCyclingQuery(bounds)
  const failures: string[] = []

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const response = await postToEndpoint(url, query)
        if (!response.ok) {
          failures.push(`HTTP ${response.status} from ${url}`)
          console.warn(`[OSM] HTTP ${response.status} from ${url}`)
          continue
        }
        const data: OverpassResponse = await response.json()
        console.log(`[OSM] Fetched ${data.elements.length} elements from ${url}`)

        // Deliberately isolated: a failed cache write used to land in the catch below,
        // which reported a successful fetch as a network error and threw the data away.
        try {
          await AsyncStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), data }))
        } catch (err) {
          console.warn('[OSM] failed to cache response', err)
        }

        return data
      } catch (err) {
        failures.push(`Network error from ${url}: ${err}`)
        console.warn(`[OSM] Network error from ${url}: ${err}`)
      }
    }
  }

  // Every endpoint failed. Stale cycleways beat no cycleways in an offline-first app,
  // so prefer expired data over an empty map if we have any.
  if (cached) {
    const ageHours = Math.round((Date.now() - cached.fetchedAt) / 3_600_000)
    console.warn(`[OSM] All endpoints failed, falling back to cache ${ageHours}h old`)
    logNonFatal(`OSM endpoints all failed; using cache ${ageHours}h old. ${failures.join(' | ')}`)
    return cached.data
  }

  logNonFatal(`OSM load failed, no cache available. ${failures.join(' | ')}`)
  throw new Error(failures.join(' | ') || 'No endpoints tried')
}

import { OSMElement, OSMNode, OSMWay } from '../types/osm'

export function isWay(el: OSMElement): el is OSMWay {
  return el.type === 'way'
}

export function isNode(el: OSMElement): el is OSMNode {
  return el.type === 'node'
}

export function isBikeParking(el: OSMElement): el is OSMNode {
  return isNode(el) && el.tags?.amenity === 'bicycle_parking'
}

export function isBikeRepair(el: OSMElement): el is OSMNode {
  return isNode(el) && el.tags?.amenity === 'bicycle_repair_station'
}

export function wayToLatLngs(
  way: OSMWay
): Array<{ latitude: number; longitude: number }> {
  if (!way.geometry) return []
  return way.geometry.map(pt => ({ latitude: pt.lat, longitude: pt.lon }))
}

export type LatLng = { latitude: number; longitude: number }

function endpointKey(p: LatLng): string {
  return `${p.latitude.toFixed(7)},${p.longitude.toFixed(7)}`
}

// OSM splits ways at every intersection, so a city's cycle network arrives as thousands
// of short stubs — 2,590 of them for Hamilton, averaging 7 points each. Drawn one
// Polyline apiece that's far more native overlays than the Google Maps SDK can pan and
// zoom smoothly, and the cost is the overlay *count*, not the geometry: simplifying the
// lines wouldn't help when 70% of them are already 5 points or fewer.
//
// Segments that share an endpoint are chained into continuous runs instead. Every
// original segment is still drawn exactly once and consecutive ones meet at a shared
// point, so the rendered map is identical — there's just ~60% less of it to redraw.
// Chaining straight through junctions is deliberate: which branch a run follows doesn't
// matter visually, only that nothing is drawn twice or left out.
export function mergeWayGeometries(ways: OSMWay[]): LatLng[][] {
  const segments = ways.map(wayToLatLngs).filter(coords => coords.length >= 2)

  const incident = new Map<string, number[]>()
  const addIncident = (key: string, index: number) => {
    const existing = incident.get(key)
    if (existing) existing.push(index)
    else incident.set(key, [index])
  }
  segments.forEach((seg, i) => {
    addIncident(endpointKey(seg[0]), i)
    addIncident(endpointKey(seg[seg.length - 1]), i)
  })

  const used = new Array<boolean>(segments.length).fill(false)
  const takeUnusedAt = (key: string): number | null => {
    const candidates = incident.get(key)
    if (!candidates) return null
    for (const i of candidates) if (!used[i]) return i
    return null
  }

  const runs: LatLng[][] = []

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue
    used[i] = true
    const run = [...segments[i]]

    for (;;) {
      const tailKey = endpointKey(run[run.length - 1])
      const j = takeUnusedAt(tailKey)
      if (j === null) break
      used[j] = true
      const seg = segments[j]
      // Drop the shared point so it isn't duplicated in the merged run.
      run.push(...(endpointKey(seg[0]) === tailKey ? seg.slice(1) : seg.slice(0, -1).reverse()))
    }

    for (;;) {
      const headKey = endpointKey(run[0])
      const j = takeUnusedAt(headKey)
      if (j === null) break
      used[j] = true
      const seg = segments[j]
      run.unshift(...(endpointKey(seg[seg.length - 1]) === headKey ? seg.slice(0, -1) : seg.slice(1).reverse()))
    }

    runs.push(run)
  }

  return runs
}

export interface LatLngBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface CyclewayRun {
  id: string
  coordinates: LatLng[]
  bounds: LatLngBounds
}

export interface Viewport {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

function pathBounds(points: LatLng[]): LatLngBounds {
  let north = points[0].latitude
  let south = points[0].latitude
  let east = points[0].longitude
  let west = points[0].longitude
  for (const p of points) {
    if (p.latitude > north) north = p.latitude
    if (p.latitude < south) south = p.latitude
    if (p.longitude > east) east = p.longitude
    if (p.longitude < west) west = p.longitude
  }
  return { north, south, east, west }
}

// Douglas-Peucker, iterative so a long run can't blow the JS stack. Distances are
// measured in a flat lon*cos(lat)/lat space, which is accurate enough over a single
// city and avoids a trig call per point.
function simplifyPath(points: LatLng[], epsilon: number, lonScale: number): LatLng[] {
  if (points.length < 3 || epsilon <= 0) return points

  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: Array<[number, number]> = [[0, points.length - 1]]

  while (stack.length > 0) {
    const [a, b] = stack.pop() as [number, number]
    if (b <= a + 1) continue

    const x1 = points[a].longitude * lonScale
    const y1 = points[a].latitude
    const x2 = points[b].longitude * lonScale
    const y2 = points[b].latitude
    const dx = x2 - x1
    const dy = y2 - y1
    const den = Math.sqrt(dx * dx + dy * dy)

    let furthest = 0
    let index = -1
    for (let k = a + 1; k < b; k++) {
      const x = points[k].longitude * lonScale
      const y = points[k].latitude
      const dist =
        den === 0
          ? Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1))
          : Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / den
      if (dist > furthest) {
        furthest = dist
        index = k
      }
    }

    if (furthest > epsilon && index > 0) {
      keep[index] = true
      stack.push([a, index], [index, b])
    }
  }

  const out: LatLng[] = []
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i])
  return out
}

export function toCyclewayRuns(ways: OSMWay[]): CyclewayRun[] {
  return mergeWayGeometries(ways).map((coordinates, index) => ({
    id: `cycleway-${index}`,
    coordinates,
    bounds: pathBounds(coordinates),
  }))
}

// Half a screen of slack on each side, so the map doesn't show a bald patch during a
// pan — onRegionChangeComplete only fires once the gesture settles.
const VIEWPORT_PADDING = 0.5

// Simplification tolerance, in screen pixels. At 1px the discarded points were landing
// inside the pixel their neighbours already cover, so the drawn line is unchanged.
const SIMPLIFY_PX = 1

// Zoom is where this pays off: panning only translates finished geometry, but a zoom
// re-projects and re-tessellates every visible vertex on every frame of the animation.
// Culling cuts the work when zoomed in (most of the city is off-screen) and the
// tolerance scales with the zoom, so zoomed-out views — where no cull is possible,
// since everything is visible — shed most of their vertices instead.
export function visibleCyclewayPaths(
  runs: CyclewayRun[],
  viewport: Viewport,
  screenWidthPx: number
): Array<{ id: string; coordinates: LatLng[] }> {
  const latPad = viewport.latitudeDelta * (0.5 + VIEWPORT_PADDING)
  const lonPad = viewport.longitudeDelta * (0.5 + VIEWPORT_PADDING)
  const north = viewport.latitude + latPad
  const south = viewport.latitude - latPad
  const east = viewport.longitude + lonPad
  const west = viewport.longitude - lonPad

  const lonScale = Math.cos((viewport.latitude * Math.PI) / 180)
  const epsilon = (viewport.longitudeDelta * lonScale * SIMPLIFY_PX) / Math.max(screenWidthPx, 1)

  const visible: Array<{ id: string; coordinates: LatLng[] }> = []
  for (const run of runs) {
    const b = run.bounds
    if (b.south > north || b.north < south || b.west > east || b.east < west) continue
    const coordinates = simplifyPath(run.coordinates, epsilon, lonScale)
    if (coordinates.length >= 2) visible.push({ id: run.id, coordinates })
  }
  return visible
}

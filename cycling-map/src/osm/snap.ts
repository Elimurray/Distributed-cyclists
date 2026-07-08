import { OSMWay } from '../types/osm'
import { wayToLatLngs } from './cycling'

interface LatLng {
  latitude: number
  longitude: number
}

export interface SnapResult {
  lat: number
  lng: number
  snappedToOSM: boolean
  osmWayId?: string
  distanceMeters: number
}

const SNAP_THRESHOLD_METERS = 20
const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// Local equirectangular projection (metres) around a reference point — accurate enough
// at Hamilton's scale (a few km) without pulling in a full geo library.
function project(point: LatLng, ref: LatLng): { x: number; y: number } {
  const x = toRad(point.longitude - ref.longitude) * Math.cos(toRad(ref.latitude)) * EARTH_RADIUS_M
  const y = toRad(point.latitude - ref.latitude) * EARTH_RADIUS_M
  return { x, y }
}

function unproject(xy: { x: number; y: number }, ref: LatLng): LatLng {
  const latitude = ref.latitude + (xy.y / EARTH_RADIUS_M) * (180 / Math.PI)
  const longitude = ref.longitude + (xy.x / (EARTH_RADIUS_M * Math.cos(toRad(ref.latitude)))) * (180 / Math.PI)
  return { latitude, longitude }
}

function nearestPointOnSegment(p: LatLng, a: LatLng, b: LatLng): { point: LatLng; distanceMeters: number } {
  const aXY = project(a, p)
  const bXY = project(b, p)
  // p projects to (0, 0) relative to itself

  const abx = bXY.x - aXY.x
  const aby = bXY.y - aXY.y
  const lengthSq = abx * abx + aby * aby

  let t = lengthSq === 0 ? 0 : (-aXY.x * abx + -aXY.y * aby) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const closest = { x: aXY.x + t * abx, y: aXY.y + t * aby }
  const distanceMeters = Math.hypot(closest.x, closest.y)

  return { point: unproject(closest, p), distanceMeters }
}

export function snapToNearestWay(point: LatLng, ways: OSMWay[]): SnapResult {
  let best: { point: LatLng; distanceMeters: number; wayId: number } | null = null

  for (const way of ways) {
    const coords = wayToLatLngs(way)
    for (let i = 0; i < coords.length - 1; i++) {
      const { point: proj, distanceMeters } = nearestPointOnSegment(point, coords[i], coords[i + 1])
      if (!best || distanceMeters < best.distanceMeters) {
        best = { point: proj, distanceMeters, wayId: way.id }
      }
    }
  }

  if (best && best.distanceMeters <= SNAP_THRESHOLD_METERS) {
    return {
      lat: best.point.latitude,
      lng: best.point.longitude,
      snappedToOSM: true,
      osmWayId: String(best.wayId),
      distanceMeters: best.distanceMeters,
    }
  }

  return {
    lat: point.latitude,
    lng: point.longitude,
    snappedToOSM: false,
    distanceMeters: best?.distanceMeters ?? Infinity,
  }
}

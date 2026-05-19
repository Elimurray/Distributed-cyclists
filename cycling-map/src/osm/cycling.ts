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

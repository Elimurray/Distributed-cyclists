export interface OSMNode {
  type: 'node'
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

export interface OSMWay {
  type: 'way'
  id: number
  nodes: number[]
  geometry?: Array<{ lat: number; lon: number }>
  tags?: Record<string, string>
}

export type OSMElement = OSMNode | OSMWay

export interface OverpassResponse {
  elements: OSMElement[]
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

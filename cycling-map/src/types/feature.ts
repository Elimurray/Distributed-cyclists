export type FeatureType =
  | 'closure'
  | 'hazard'
  | 'parking'
  | 'repair'
  | 'trail'
  | 'condition'
  | 'infrastructure'

export type ConditionStatus = 'open' | 'closed' | 'degraded' | 'unknown'

export interface MapFeature {
  id: string
  type: FeatureType
  status: ConditionStatus
  coordinates: {
    lat: number
    lng: number
    snappedToOSM: boolean
    osmNodeId?: string
  }
  title: string
  description?: string
  reportedBy: string
  reportedAt: string
  updatedAt: string
  expiresAt?: string
  confirmations: number
  flags: number
  region: 'hamilton' | 'tauranga'
  osmWayId?: string
}

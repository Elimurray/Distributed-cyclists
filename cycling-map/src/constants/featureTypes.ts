import { ConditionStatus, FeatureType } from '../types/feature'

const DAY_MS = 24 * 60 * 60 * 1000

interface FeatureTypeMeta {
  label: string
  color: string
  defaultStatus: ConditionStatus
  /** How long a newly-reported feature of this type stays on the map before auto-expiring. Undefined = permanent. */
  defaultExpiryMs?: number
}

export const FEATURE_TYPE_META: Record<FeatureType, FeatureTypeMeta> = {
  closure: { label: 'Closure', color: '#E63946', defaultStatus: 'closed', defaultExpiryMs: 3 * DAY_MS },
  hazard: { label: 'Hazard', color: '#F4A261', defaultStatus: 'degraded', defaultExpiryMs: 7 * DAY_MS },
  parking: { label: 'Parking', color: '#2A9D8F', defaultStatus: 'open' },
  repair: { label: 'Repair Station', color: '#E9C46A', defaultStatus: 'open' },
  trail: { label: 'Trail', color: '#2E86AB', defaultStatus: 'open' },
  condition: { label: 'Path Condition', color: '#8E44AD', defaultStatus: 'degraded', defaultExpiryMs: 14 * DAY_MS },
  infrastructure: { label: 'Infrastructure', color: '#457B9D', defaultStatus: 'unknown' },
}

export const FEATURE_TYPES = Object.keys(FEATURE_TYPE_META) as FeatureType[]

export const STATUS_LABELS: Record<ConditionStatus, string> = {
  open: 'Open',
  degraded: 'Degraded',
  closed: 'Closed',
  unknown: 'Unknown',
}

export const STATUSES: ConditionStatus[] = ['open', 'degraded', 'closed', 'unknown']

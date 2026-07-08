import { ConditionStatus, FeatureType } from '../types/feature'

interface FeatureTypeMeta {
  label: string
  color: string
  defaultStatus: ConditionStatus
}

export const FEATURE_TYPE_META: Record<FeatureType, FeatureTypeMeta> = {
  closure: { label: 'Closure', color: '#E63946', defaultStatus: 'closed' },
  hazard: { label: 'Hazard', color: '#F4A261', defaultStatus: 'degraded' },
  parking: { label: 'Parking', color: '#2A9D8F', defaultStatus: 'open' },
  repair: { label: 'Repair Station', color: '#E9C46A', defaultStatus: 'open' },
  trail: { label: 'Trail', color: '#2E86AB', defaultStatus: 'open' },
  condition: { label: 'Path Condition', color: '#8E44AD', defaultStatus: 'degraded' },
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

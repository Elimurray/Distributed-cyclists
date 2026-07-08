export type Confidence = 'verified' | 'unverified' | 'disputed'

const DISPUTE_FLAG_THRESHOLD = 3
const VERIFIED_CONFIRMATION_THRESHOLD = 2

export function getConfidence(counts: { confirmations: number; flags: number }): Confidence {
  if (counts.flags >= DISPUTE_FLAG_THRESHOLD && counts.flags > counts.confirmations) {
    return 'disputed'
  }
  if (counts.confirmations >= VERIFIED_CONFIRMATION_THRESHOLD && counts.flags === 0) {
    return 'verified'
  }
  return 'unverified'
}

export const CONFIDENCE_META: Record<Confidence, { label: string; color: string }> = {
  verified: { label: 'Verified', color: '#2A9D8F' },
  unverified: { label: 'Unverified', color: '#888' },
  disputed: { label: 'Disputed', color: '#E63946' },
}

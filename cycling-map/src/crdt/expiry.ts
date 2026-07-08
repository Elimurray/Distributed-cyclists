import { deleteVotesForFeature, yFeatures } from './ydoc'

const SWEEP_INTERVAL_MS = 60_000

function sweepExpired() {
  const now = Date.now()
  yFeatures.forEach((feature, id) => {
    if (feature.expiresAt && new Date(feature.expiresAt).getTime() <= now) {
      yFeatures.delete(id)
      deleteVotesForFeature(id)
    }
  })
}

// Every connected device independently sweeps expired features from the shared doc.
// Deleting an already-deleted Y.Map key is a safe no-op, so concurrent sweeps across
// devices don't conflict — this needs no coordination.
sweepExpired()
setInterval(sweepExpired, SWEEP_INTERVAL_MS)

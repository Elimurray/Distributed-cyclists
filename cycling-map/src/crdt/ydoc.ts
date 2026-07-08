import * as Y from 'yjs'
import { MapFeature } from '../types/feature'

export type Vote = 'confirm' | 'flag'

export const ydoc = new Y.Doc()

export const yFeatures = ydoc.getMap<MapFeature>('features')

// One entry per (feature, device) pair, keyed so each device only ever writes its own
// key — concurrent votes from different devices land on different keys and can't
// conflict or overwrite each other, unlike a mutable counter on the feature itself.
export const yVotes = ydoc.getMap<Vote>('votes')

export function voteKey(featureId: string, deviceId: string): string {
  return `${featureId}::${deviceId}`
}

export function deleteVotesForFeature(featureId: string): void {
  const prefix = `${featureId}::`
  const keysToDelete: string[] = []
  yVotes.forEach((_, key) => {
    if (key.startsWith(prefix)) keysToDelete.push(key)
  })
  keysToDelete.forEach(key => yVotes.delete(key))
}

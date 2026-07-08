import { useCallback, useEffect, useState } from 'react'
import { ydoc, yVotes, voteKey, Vote } from '../crdt/ydoc'

interface Tally {
  confirmations: number
  flags: number
}

function tally(featureId: string): Tally {
  let confirmations = 0
  let flags = 0
  const prefix = `${featureId}::`
  yVotes.forEach((vote, key) => {
    if (!key.startsWith(prefix)) return
    if (vote === 'confirm') confirmations++
    else if (vote === 'flag') flags++
  })
  return { confirmations, flags }
}

export function useVotes(featureId: string | undefined, deviceId: string | null) {
  const [counts, setCounts] = useState<Tally>(() => (featureId ? tally(featureId) : { confirmations: 0, flags: 0 }))

  useEffect(() => {
    if (!featureId) return
    const update = () => setCounts(tally(featureId))
    update()
    yVotes.observe(update)
    return () => yVotes.unobserve(update)
  }, [featureId])

  const myVote: Vote | null = featureId && deviceId ? yVotes.get(voteKey(featureId, deviceId)) ?? null : null

  const castVote = useCallback((vote: Vote) => {
    if (!featureId || !deviceId) return
    const key = voteKey(featureId, deviceId)
    ydoc.transact(() => {
      // tapping the same vote again retracts it, otherwise it replaces your own prior vote
      if (yVotes.get(key) === vote) {
        yVotes.delete(key)
      } else {
        yVotes.set(key, vote)
      }
    })
  }, [featureId, deviceId])

  return { ...counts, myVote, castVote }
}

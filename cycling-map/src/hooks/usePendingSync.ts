import { useEffect, useState } from 'react'
import { getHasPendingChanges, subscribePendingChanges } from '../crdt/pendingSync'

export function usePendingSync(): boolean {
  const [pending, setPending] = useState(getHasPendingChanges)

  useEffect(() => {
    return subscribePendingChanges(() => setPending(getHasPendingChanges()))
  }, [])

  return pending
}

import { useEffect, useState } from 'react'
import { getDeviceId } from '../crdt/device'

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    getDeviceId().then(setDeviceId)
  }, [])

  return deviceId
}

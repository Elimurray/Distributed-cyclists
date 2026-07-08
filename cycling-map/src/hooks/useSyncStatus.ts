import { useEffect, useState } from 'react'
import { provider } from '../crdt/provider'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface SyncState {
  status: ConnectionStatus
  synced: boolean
  peers: number
}

function currentState(): SyncState {
  return {
    status: provider.wsconnected ? 'connected' : 'connecting',
    synced: provider.synced,
    peers: provider.awareness.getStates().size,
  }
}

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(currentState)

  useEffect(() => {
    const onStatus = ({ status }: { status: ConnectionStatus }) => {
      setState(s => ({ ...s, status }))
    }
    const onSync = (synced: boolean) => {
      setState(s => ({ ...s, synced }))
    }
    const onAwareness = () => {
      setState(s => ({ ...s, peers: provider.awareness.getStates().size }))
    }

    provider.on('status', onStatus)
    provider.on('sync', onSync)
    provider.awareness.on('change', onAwareness)

    return () => {
      provider.off('status', onStatus)
      provider.off('sync', onSync)
      provider.awareness.off('change', onAwareness)
    }
  }, [])

  return state
}

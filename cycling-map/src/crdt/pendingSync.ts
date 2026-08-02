// Whether the local doc has diverged from the last state we know was actually
// confirmed synced with the relay, so the UI can show "unsynced changes" instead of
// silently pretending everything's up to date.
//
// Deliberately not an in-memory edit counter — that resets to 0 on every app restart
// regardless of whether the doc still holds genuinely unsynced content, which is wrong:
// force-closing the app while offline after an edit would silently drop the indicator
// even though nothing had actually synced yet. Comparing persisted state vectors
// survives restarts correctly by construction.
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Y from 'yjs'
import { ydoc } from './ydoc'
import { provider } from './provider'

const LAST_SYNCED_KEY = 'cycling-map:last-synced-state-vector'

// "Nothing has ever synced" is treated the same as "last synced state was empty" —
// avoids a false-positive pending indicator on a fresh install with an empty doc.
let lastSyncedStateVector: Uint8Array = Y.encodeStateVector(new Y.Doc())
let hasPendingChanges = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

function stateVectorsEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function recomputePending() {
  const current = Y.encodeStateVector(ydoc)
  const next = !stateVectorsEqual(current, lastSyncedStateVector)
  if (next !== hasPendingChanges) {
    hasPendingChanges = next
    notify()
  }
}

async function init() {
  const stored = await AsyncStorage.getItem(LAST_SYNCED_KEY)
  if (stored) {
    lastSyncedStateVector = Buffer.from(stored, 'base64')
  }
  recomputePending()
}

init()

ydoc.on('update', () => {
  recomputePending()
})

provider.on('sync', async (isSynced: boolean) => {
  if (!isSynced) return
  lastSyncedStateVector = Y.encodeStateVector(ydoc)
  try {
    await AsyncStorage.setItem(LAST_SYNCED_KEY, Buffer.from(lastSyncedStateVector).toString('base64'))
  } catch (err) {
    console.warn('[pendingSync] failed to persist last-synced state vector', err)
  }
  recomputePending()
})

export function getHasPendingChanges(): boolean {
  return hasPendingChanges
}

export function subscribePendingChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

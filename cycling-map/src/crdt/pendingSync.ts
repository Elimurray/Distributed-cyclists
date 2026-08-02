// Whether there's a local edit that was made while genuinely disconnected from the
// relay, so the UI can show "unsynced changes" instead of silently pretending
// everything's up to date.
//
// An edit made while *connected* was, for practical purposes, already sent — Yjs
// broadcasts updates continuously over an open socket as they happen, there's no
// batching/queueing step to wait on. So the only real "pending" state is: an edit
// happened while offline, and we haven't reconnected since.
//
// Persisted (not just in-memory) so this survives an app restart while still offline —
// an earlier in-memory-only version of this reset to "not pending" on relaunch even
// though the doc still held genuinely unsynced content, which is wrong.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ydoc } from './ydoc'
import { provider } from './provider'

const STORAGE_KEY = 'cycling-map:has-pending-changes'

let hasPendingChanges = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

async function setPending(value: boolean) {
  if (value === hasPendingChanges) return
  hasPendingChanges = value
  notify()
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch (err) {
    console.warn('[pendingSync] failed to persist pending flag', err)
  }
}

async function init() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY)
  if (stored === 'true') {
    hasPendingChanges = true
    notify()
  }
}

init()

ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
  // Only genuinely local transactions (origin null) — see the same distinction used in
  // Milestone 4's votes fix and in persistence.ts's hydration origin.
  if (origin !== null) return
  if (!provider.wsconnected) {
    setPending(true)
  }
})

provider.on('sync', (isSynced: boolean) => {
  if (isSynced) {
    setPending(false)
  }
})

export function getHasPendingChanges(): boolean {
  return hasPendingChanges
}

export function subscribePendingChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

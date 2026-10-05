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

// Whether a relay handshake has completed since launch. init()'s storage read is async
// and can resolve *after* that handshake, in which case the stored value is already
// stale and must not be allowed to resurrect a flag the sync just cleared.
let hasSyncedThisSession = false

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

async function setPending(value: boolean) {
  if (value !== hasPendingChanges) {
    hasPendingChanges = value
    notify()
  }
  // Persisted unconditionally, even when the in-memory flag didn't move: returning
  // early here would leave a stale 'true' on disk whenever the flag was already false,
  // and 'sync' only fires on connect, so nothing would ever clear it again.
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch (err) {
    console.warn('[pendingSync] failed to persist pending flag', err)
  }
}

async function init() {
  let stored: string | null = null
  try {
    stored = await AsyncStorage.getItem(STORAGE_KEY)
  } catch (err) {
    console.warn('[pendingSync] failed to read pending flag', err)
    return
  }

  if (hasSyncedThisSession) {
    // We synced while this read was in flight, so the doc is up to date regardless of
    // what was on disk. Clear it rather than restore it.
    setPending(false)
    return
  }

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
    hasSyncedThisSession = true
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

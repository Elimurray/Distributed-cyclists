// Yjs' doc only lives in memory otherwise — if the app is killed while offline, any
// local edit that hasn't reached the relay yet is gone for good. This mirrors what
// y-indexeddb does for web: persist the full doc state locally so a cold start doesn't
// depend on the relay being reachable, and no data is lost to an offline app kill.
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Y from 'yjs'
import { ydoc } from './ydoc'

const STORAGE_KEY = 'cycling-map:ydoc-state-v2'
const SAVE_DEBOUNCE_MS = 1000

export const PERSISTENCE_ORIGIN = 'persistence'

async function hydrate() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (!stored) return
    const update = Buffer.from(stored, 'base64')
    Y.applyUpdateV2(ydoc, update, PERSISTENCE_ORIGIN)
  } catch (err) {
    console.warn('[persistence] failed to hydrate from storage', err)
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      const update = Y.encodeStateAsUpdateV2(ydoc)
      const base64 = Buffer.from(update).toString('base64')
      await AsyncStorage.setItem(STORAGE_KEY, base64)
    } catch (err) {
      console.warn('[persistence] failed to save to storage', err)
    }
  }, SAVE_DEBOUNCE_MS)
}

hydrate()

ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
  if (origin === PERSISTENCE_ORIGIN) return // don't re-save what we just loaded
  scheduleSave()
})

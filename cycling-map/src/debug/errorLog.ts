// Lightweight, self-contained crash visibility for field testing — no third-party
// service, no account, no new native dependency. Catches unhandled JS errors via RN's
// global error handler and persists the last few locally so they're inspectable from
// the app itself after a field session, without needing a laptop attached. This does
// NOT catch native-level crashes (a full native exception bypasses JS entirely) — for
// that you'd need a real crash reporting service (e.g. Sentry).
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'cycling-map:error-log'
const MAX_ENTRIES = 20

export interface LoggedError {
  message: string
  stack?: string
  isFatal: boolean
  timestamp: string
}

async function appendError(entry: LoggedError) {
  try {
    const existing = await getErrorLog()
    const next = [entry, ...existing].slice(0, MAX_ENTRIES)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // if we can't even log the error, there's nothing more useful to do here
  }
}

export async function getErrorLog(): Promise<LoggedError[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Non-fatal diagnostics for things that were handled but still worth seeing from the
// Debug screen during a field session — a network path that failed and fell back, say.
// The global handler below only ever sees *unhandled* errors, so anything caught in a
// .catch() would otherwise be invisible to a tester without a laptop attached.
export function logNonFatal(message: string): void {
  appendError({
    message,
    isFatal: false,
    timestamp: new Date().toISOString(),
  })
}

export async function clearErrorLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

// @ts-expect-error ErrorUtils is a React Native global, not declared in lib.dom types
const errorUtils = global.ErrorUtils
if (errorUtils) {
  const previousHandler = errorUtils.getGlobalHandler()
  errorUtils.setGlobalHandler((error: unknown, isFatal: boolean) => {
    appendError({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isFatal: !!isFatal,
      timestamp: new Date().toISOString(),
    })
    previousHandler(error, isFatal)
  })
}

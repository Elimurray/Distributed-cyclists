// Admin CLI: lists every feature currently on the shared map and lets you remove any of
// them by index, regardless of who reported it. Deliberately kept out of the shipped
// app — every field tester installs the same APK, so any "admin mode" baked into it is
// a hidden capability in something we hand out, not real access control. Running this
// from the laptop instead keeps the app itself simple and keeps moderation power where
// it actually belongs during a research prototype's testing phase: with the researcher,
// not embedded in the client.
//
// Usage: node admin/manage.mjs
// Optional: RELAY_URL=wss://api-cycling.azzudo.com node admin/manage.mjs (defaults below)
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import ws from 'ws'
import readline from 'readline'

const RELAY_URL = process.env.RELAY_URL || 'wss://api-cycling.azzudo.com'
const ROOM_NAME = 'cycling-map-hamilton'

const doc = new Y.Doc()
const features = doc.getMap('features')
const votes = doc.getMap('votes')

const provider = new WebsocketProvider(RELAY_URL, ROOM_NAME, doc, { WebSocketPolyfill: ws })

function deleteVotesForFeature(featureId) {
  const prefix = `${featureId}::`
  const keysToDelete = []
  votes.forEach((_, key) => {
    if (key.startsWith(prefix)) keysToDelete.push(key)
  })
  keysToDelete.forEach(key => votes.delete(key))
}

function removeFeature(id, title) {
  doc.transact(() => {
    features.delete(id)
    deleteVotesForFeature(id)
  })
  console.log(`Removed "${title}".`)
}

function listFeatures() {
  const entries = Array.from(features.entries())
  if (entries.length === 0) {
    console.log('\nNo features currently on the map.')
    return entries
  }
  console.log(`\n${entries.length} feature(s):\n`)
  entries.forEach(([id, feature], i) => {
    console.log(`[${i}] ${feature.type} — "${feature.title}" — reported by ${feature.reportedBy.slice(0, 8)} at ${feature.reportedAt}`)
    console.log(`     id: ${id}`)
  })
  return entries
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function prompt() {
  if (rl.closed) return
  rl.question('\nEnter an index to remove, "all" to remove everything, "r" to refresh, or "q" to quit: ', answer => {
    const trimmed = answer.trim().toLowerCase()

    if (trimmed === 'q') {
      rl.close()
      provider.destroy()
      process.exit(0)
      return
    }

    if (trimmed === 'r') {
      listFeatures()
      prompt()
      return
    }

    const entries = Array.from(features.entries())

    if (trimmed === 'all') {
      if (entries.length === 0) {
        prompt()
        return
      }
      rl.question(`Really remove all ${entries.length} feature(s)? (yes/no): `, confirm => {
        if (confirm.trim().toLowerCase() === 'yes') {
          entries.forEach(([id, feature]) => removeFeature(id, feature.title))
        }
        listFeatures()
        prompt()
      })
      return
    }

    const index = parseInt(trimmed, 10)
    if (!Number.isNaN(index) && entries[index]) {
      const [id, feature] = entries[index]
      removeFeature(id, feature.title)
    } else {
      console.log('Not a valid index.')
    }
    listFeatures()
    prompt()
  })
}

provider.on('status', event => console.log('[relay]', event.status))

let started = false
provider.on('sync', synced => {
  if (!synced || started) return
  started = true
  console.log(`Connected to ${RELAY_URL}, room "${ROOM_NAME}"`)
  listFeatures()
  prompt()
})

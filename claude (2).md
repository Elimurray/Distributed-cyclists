# Claude.md — Distributed Cycling Map (ENGEN582-26X)

## Project Overview

A distributed, community-maintained cycling map for Hamilton and Tauranga, New Zealand.
Cyclists can add, edit, and flag infrastructure features (closures, parking, hazards, trails)
directly from their phone. Updates sync across all devices using CRDTs — no central server
required for conflict resolution. Built in React Native for iOS and Android.

**Student:** Eli Murray (ID: 1626960)  
**Supervisor:** Steve Reeves  
**University:** University of Waikato  
**Timeline:** Q1–Q4 2026

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile framework | React Native (Expo) | Cross-platform iOS/Android, strong map library support |
| Map rendering | react-native-maps + react-native-leaflet | Native performance on device |
| CRDT sync | Yjs | Most mature offline-first CRDT library, JS-native |
| Sync transport | y-websocket (relay only) | Lightweight relay; clients own the data |
| Base map data | OpenStreetMap via Overpass API | Open license, cycling tags, local NZ coverage |
| Local storage | AsyncStorage + IndexedDB (via Yjs persistence) | Offline-first data persistence |
| Backend (minimal) | Node.js + y-websocket server | Relay only — no authoritative data storage |
| Language | TypeScript throughout | Type safety for geographic data structures |

---

## Repository Structure

```
cycling-map/
├── claude.md                          ← This file
├── app/                               ← Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx                  ← Map screen (main)
│   │   ├── contribute.tsx             ← Add/edit feature screen
│   │   └── community.tsx              ← Recent reports feed
│   ├── feature/[id].tsx               ← Feature detail/edit
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   ├── CyclingMap.tsx         ← Core map component
│   │   │   ├── FeatureMarker.tsx      ← Individual map marker
│   │   │   ├── FeatureOverlay.tsx     ← Community layer on top of OSM
│   │   │   └── MapControls.tsx        ← Zoom, locate, filter controls
│   │   ├── contribution/
│   │   │   ├── ReportForm.tsx         ← Submit a new feature/condition
│   │   │   ├── FeatureTypeSelector.tsx
│   │   │   └── LocationPicker.tsx     ← Snap-to-road location picker
│   │   └── ui/
│   │       ├── SyncStatus.tsx         ← Offline/syncing/live indicator
│   │       └── ConfidenceBar.tsx      ← Data quality indicator
│   ├── crdt/
│   │   ├── store.ts                   ← Yjs document initialisation
│   │   ├── mapFeatures.ts             ← CRDT map feature operations
│   │   ├── sync.ts                    ← WebSocket provider + offline queue
│   │   └── persistence.ts             ← AsyncStorage persistence provider
│   ├── osm/
│   │   ├── overpass.ts                ← Overpass API queries
│   │   ├── cycling.ts                 ← Cycling-specific OSM tag parsing
│   │   └── snap.ts                    ← Snap coordinates to OSM road network
│   ├── types/
│   │   ├── feature.ts                 ← MapFeature, FeatureType, Condition
│   │   ├── crdt.ts                    ← CRDT operation types
│   │   └── osm.ts                     ← OSM node/way/relation types
│   ├── hooks/
│   │   ├── useMapFeatures.ts          ← Subscribe to CRDT map state
│   │   ├── useOSMData.ts              ← Fetch + cache OSM base data
│   │   ├── useSyncStatus.ts           ← Online/offline/syncing state
│   │   └── useLocation.ts             ← Device GPS with permissions
│   ├── utils/
│   │   ├── geo.ts                     ← Haversine, bounding box helpers
│   │   ├── quality.ts                 ← Confidence scoring for features
│   │   └── hamilton.ts                ← Hamilton/Tauranga bounding boxes
│   └── constants/
│       ├── featureTypes.ts            ← Enum + metadata for feature types
│       └── regions.ts                 ← NZ city bounding boxes
├── server/
│   ├── index.ts                       ← y-websocket relay server
│   └── Dockerfile
├── docs/
│   ├── architecture.md
│   ├── data-schema.md
│   └── crdt-decisions.md
└── __tests__/
    ├── crdt/
    ├── osm/
    └── utils/
```

---

## Data Schema

### MapFeature (the core CRDT unit)

```typescript
type FeatureType =
  | 'closure'        // Temporary path/lane closure
  | 'hazard'         // Pothole, debris, flooding
  | 'parking'        // Bike parking (formal or informal)
  | 'repair'         // Repair station / pump
  | 'trail'          // Informal off-road trail
  | 'condition'      // General surface/condition report
  | 'infrastructure' // New or changed official infrastructure

type ConditionStatus = 'open' | 'closed' | 'degraded' | 'unknown'

interface MapFeature {
  id: string                    // UUID v4
  type: FeatureType
  status: ConditionStatus
  coordinates: {
    lat: number
    lng: number
    snappedToOSM: boolean       // Was this snapped to road network?
    osmNodeId?: string          // If snapped, which OSM node
  }
  title: string
  description?: string
  reportedBy: string            // Anonymous contributor ID (device UUID)
  reportedAt: string            // ISO timestamp
  updatedAt: string
  expiresAt?: string            // For temporary closures
  confirmations: number         // How many others have confirmed this
  flags: number                 // How many have flagged as inaccurate
  region: 'hamilton' | 'tauranga'
  osmWayId?: string             // Associated OSM way if known
}
```

### CRDT Storage Structure (Yjs)

```typescript
// Top-level Yjs document structure
const ydoc = new Y.Doc()

// Features stored as a Y.Map keyed by feature ID
const features = ydoc.getMap<MapFeature>('features')

// Confirmations stored separately to avoid merge conflicts on the main object
const confirmations = ydoc.getMap<number>('confirmations')

// Flags similarly separated
const flags = ydoc.getMap<number>('flags')
```

---

## Milestones

---

### Milestone 1 — Project Setup & Base Map
**Target: Week of May 19, 2026**

Get a working React Native app showing a map of Hamilton with OSM cycling data.
This is the foundation everything else builds on. Do not skip steps here.

#### Tasks

**1.1 — Initialise Expo project**
```bash
npx create-expo-app cycling-map --template blank-typescript
cd cycling-map
npx expo install react-native-maps expo-location
npm install typescript @types/react --save-dev
```

**1.2 — Install all dependencies upfront**
```bash
# CRDT
npm install yjs y-websocket y-asyncstorage

# Map
npm install react-native-maps

# Storage
npm install @react-native-async-storage/async-storage

# Utilities
npm install uuid @types/uuid
```

**1.3 — Set up bounding boxes for target cities**
```typescript
// src/constants/regions.ts
export const REGIONS = {
  hamilton: {
    name: 'Hamilton',
    bounds: {
      north: -37.7200,
      south: -37.8200,
      east: 175.3200,
      west: 175.2200,
    },
    center: { lat: -37.7870, lng: 175.2793 },
    defaultZoom: 13,
  },
  tauranga: {
    name: 'Tauranga',
    bounds: {
      north: -37.6300,
      south: -37.7300,
      east: 176.2200,
      west: 176.1000,
    },
    center: { lat: -37.6878, lng: 176.1651 },
    defaultZoom: 13,
  },
}
```

**1.4 — Write Overpass query for cycling infrastructure**
```typescript
// src/osm/overpass.ts
export function buildCyclingQuery(bounds: BoundingBox): string {
  const { south, west, north, east } = bounds
  const bbox = `${south},${west},${north},${east}`

  return `
    [out:json][timeout:30];
    (
      way["highway"="cycleway"](${bbox});
      way["cycleway"="lane"](${bbox});
      way["cycleway"="track"](${bbox});
      way["cycleway"="shared_lane"](${bbox});
      way["bicycle"="designated"](${bbox});
      node["amenity"="bicycle_parking"](${bbox});
      node["amenity"="bicycle_repair_station"](${bbox});
    );
    out body geom;
  `
}

export async function fetchCyclingData(bounds: BoundingBox) {
  const query = buildCyclingQuery(bounds)
  const encoded = encodeURIComponent(query)
  const url = `https://overpass-api.de/api/interpreter?data=${encoded}`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`)
  return response.json()
}
```

**1.5 — Render base map with OSM cycling overlay**

Basic `CyclingMap.tsx` that:
- Shows react-native-maps centred on Hamilton
- Fetches OSM cycling data on mount
- Renders cycleways as polylines in a distinct colour (e.g. `#2E86AB`)
- Renders parking/repair nodes as markers
- Caches OSM response in AsyncStorage to avoid hammering Overpass

#### Definition of Done
- [ ] App runs on iOS simulator and Android emulator
- [ ] Map loads centred on Hamilton CBD
- [ ] OSM cycling infrastructure visible as overlay
- [ ] Console shows successful Overpass API response
- [ ] Cached OSM data loads on second launch without network call

---

### Milestone 2 — CRDT Sync Layer
**Target: Week of June 1, 2026**

Implement the Yjs document and WebSocket sync. Two devices (or browser tabs)
editing the same map should converge to identical state.

#### Tasks

**2.1 — Initialise Yjs document**
```typescript
// src/crdt/store.ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import AsyncStorageProvider from 'y-asyncstorage'

export const ydoc = new Y.Doc()
export const features = ydoc.getMap<MapFeature>('features')
export const confirmations = ydoc.getMap<number>('confirmations')
export const flags = ydoc.getMap<number>('flags')

let provider: WebsocketProvider | null = null

export function initSync(room: string) {
  // Persist to device storage (offline-first)
  const persistence = new AsyncStorageProvider(room, ydoc)
  persistence.get()

  // Connect to relay when online
  provider = new WebsocketProvider(
    'wss://your-relay-server.com',
    room,
    ydoc,
    { connect: false } // Don't auto-connect — handle manually
  )

  return { provider, persistence }
}

export function connect() {
  provider?.connect()
}

export function disconnect() {
  provider?.disconnect()
}
```

**2.2 — Feature CRUD operations**
```typescript
// src/crdt/mapFeatures.ts
import { features, ydoc } from './store'
import { v4 as uuidv4 } from 'uuid'

export function addFeature(data: Omit<MapFeature, 'id'>): string {
  const id = uuidv4()
  const feature: MapFeature = { ...data, id }

  ydoc.transact(() => {
    features.set(id, feature)
  })

  return id
}

export function updateFeature(id: string, updates: Partial<MapFeature>): void {
  const existing = features.get(id)
  if (!existing) throw new Error(`Feature ${id} not found`)

  ydoc.transact(() => {
    features.set(id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  })
}

export function deleteFeature(id: string): void {
  ydoc.transact(() => {
    features.delete(id)
  })
}

export function confirmFeature(id: string): void {
  // Confirmations are separate to avoid clobbering the main feature
  // Note: plain increment has a last-write-wins conflict; for research
  // purposes document this trade-off and consider Y.Array of votes instead
  const current = confirmations.get(id) ?? 0
  confirmations.set(id, current + 1)
}
```

**2.3 — React hook to subscribe to map state**
```typescript
// src/hooks/useMapFeatures.ts
import { useEffect, useState } from 'react'
import { features, confirmations, flags } from '../crdt/store'

export function useMapFeatures(region: 'hamilton' | 'tauranga') {
  const [featureList, setFeatureList] = useState<MapFeature[]>([])

  useEffect(() => {
    const update = () => {
      const all = Array.from(features.values())
      const filtered = all.filter(f => f.region === region)
      setFeatureList(filtered)
    }

    update() // Initial load
    features.observe(update)

    return () => features.unobserve(update)
  }, [region])

  return featureList
}
```

**2.4 — Set up y-websocket relay server**
```typescript
// server/index.ts
import { createServer } from 'http'
import { setupWSConnection } from 'y-websocket/bin/utils'
import WebSocket from 'ws'

const server = createServer((req, res) => {
  res.writeHead(200)
  res.end('Cycling Map Relay')
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, {
    gc: true // Enable garbage collection of deleted items
  })
})

server.listen(1234, () => {
  console.log('y-websocket relay running on :1234')
})
```

**2.5 — Sync status indicator**
```typescript
// src/hooks/useSyncStatus.ts
import { useEffect, useState } from 'react'
import { provider } from '../crdt/store'

type SyncStatus = 'offline' | 'connecting' | 'synced' | 'syncing'

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('offline')

  useEffect(() => {
    if (!provider) return

    provider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') setStatus('synced')
      if (status === 'disconnected') setStatus('offline')
      if (status === 'connecting') setStatus('connecting')
    })

    provider.on('sync', (synced: boolean) => {
      setStatus(synced ? 'synced' : 'syncing')
    })
  }, [])

  return status
}
```

#### Definition of Done
- [ ] Two devices/simulators can add features that appear on each other's maps
- [ ] Features added offline appear after reconnecting
- [ ] SyncStatus component shows correct state
- [ ] Merge conflict test: two devices edit same feature while offline, reconnect — no crash, last-write wins documented

---

### Milestone 3 — Contribution UI
**Target: Week of June 22, 2026**

Cyclists can tap the map to report a feature. Submission is simple: type, location (snapped to road), description, and expiry for temporary closures.

#### Tasks

**3.1 — Location snapping to OSM road network**
```typescript
// src/osm/snap.ts
// Query nearest OSM node to raw GPS coordinates
// This avoids storing raw GPS traces (privacy protection per Chatzimilioudis et al.)
export async function snapToRoad(
  lat: number,
  lng: number,
  radiusMetres = 30
): Promise<{ lat: number; lng: number; osmNodeId?: string }> {
  const query = `
    [out:json];
    (
      node(around:${radiusMetres},${lat},${lng})["highway"];
    );
    out body;
  `
  const encoded = encodeURIComponent(query)
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encoded}`)
  const data = await res.json()

  if (data.elements.length === 0) {
    return { lat, lng, osmNodeId: undefined } // No snap available
  }

  // Return nearest node
  const nearest = data.elements[0]
  return {
    lat: nearest.lat,
    lng: nearest.lon,
    osmNodeId: String(nearest.id),
  }
}
```

**3.2 — Feature type definitions with display metadata**
```typescript
// src/constants/featureTypes.ts
export const FEATURE_TYPES = {
  closure: {
    label: 'Closure',
    description: 'Path or lane is blocked',
    icon: '🚧',
    colour: '#E63946',
    defaultExpiry: 7, // days
  },
  hazard: {
    label: 'Hazard',
    description: 'Pothole, debris, flooding, low visibility',
    icon: '⚠️',
    colour: '#F4A261',
    defaultExpiry: 3,
  },
  parking: {
    label: 'Bike Parking',
    description: 'Formal or informal bike parking',
    icon: '🅿️',
    colour: '#2A9D8F',
    defaultExpiry: undefined, // Permanent
  },
  repair: {
    label: 'Repair Station',
    description: 'Tools, pump, or repair stand',
    icon: '🔧',
    colour: '#2A9D8F',
    defaultExpiry: undefined,
  },
  trail: {
    label: 'Trail',
    description: 'Informal off-road route',
    icon: '🌿',
    colour: '#606C38',
    defaultExpiry: undefined,
  },
  condition: {
    label: 'Condition Report',
    description: 'General surface or usability report',
    icon: '📋',
    colour: '#8338EC',
    defaultExpiry: 14,
  },
} as const
```

**3.3 — Report form screen**

`contribute.tsx` should:
- Show map with tap-to-place pin
- Snap pin to OSM road network on placement
- Show `FeatureTypeSelector` (grid of type buttons)
- Text input for title (required) and description (optional)
- Date picker for expiry (shown only for closure/hazard/condition types)
- Submit button → calls `addFeature()` → navigates back to map
- Optimistically show new feature on map immediately

**3.4 — Anonymous contributor ID**
```typescript
// src/utils/contributor.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

// Generate once per install, never tied to identity
export async function getContributorId(): Promise<string> {
  const existing = await AsyncStorage.getItem('contributor_id')
  if (existing) return existing

  const id = uuidv4()
  await AsyncStorage.setItem('contributor_id', id)
  return id
}
```

#### Definition of Done
- [ ] Tap map → pin placed at tapped location
- [ ] Pin snaps to nearest OSM road node within 30m
- [ ] All 6 feature types selectable
- [ ] Submitted feature appears on map within 500ms
- [ ] Feature syncs to second device within 5 seconds on good connection

---

### Milestone 4 — Data Quality & Moderation
**Target: Week of July 13, 2026**

Address the core VGI quality problem: anyone can submit anything.
Use confirmation and flagging rather than gatekeeping.

#### Tasks

**4.1 — Confidence scoring**
```typescript
// src/utils/quality.ts
export function confidenceScore(feature: MapFeature): number {
  const age = Date.now() - new Date(feature.reportedAt).getTime()
  const ageDays = age / (1000 * 60 * 60 * 24)

  // Base score from confirmations vs flags
  const voteScore = feature.confirmations - feature.flags * 2

  // Decay score for old unconfirmed reports (especially temporary ones)
  const decayFactor = feature.expiresAt ? Math.max(0, 1 - ageDays / 7) : 1

  return Math.max(0, Math.min(100, (voteScore + 1) * 20 * decayFactor))
}

export function shouldDisplay(feature: MapFeature): boolean {
  if (feature.flags >= 3) return false // Auto-hide heavily flagged
  if (confidenceScore(feature) < 10) return false
  if (feature.expiresAt && new Date(feature.expiresAt) < new Date()) return false
  return true
}
```

**4.2 — Confirm / Flag actions on feature detail screen**

Feature detail screen (`feature/[id].tsx`) should include:
- "This is still accurate" → `confirmFeature(id)`
- "This is wrong / no longer exists" → `flagFeature(id)`
- Confidence bar showing current score
- Timestamp of last update and reporter count

**4.3 — Auto-expiry of stale temporary features**

On app start and every 6 hours, run a cleanup pass:
- Features with `expiresAt` in the past → update status to `'closed'`
- Features with confidence < 10 and age > 30 days → soft-delete

Document this decision: this is not the CRDT making an editorial call.
It is a client-side filter. The data remains in the CRDT; it just is not shown.

#### Definition of Done
- [ ] Confidence score visible on all feature markers (colour coded)
- [ ] Confirm/flag actions update the CRDT and reflect on both devices
- [ ] Features with 3+ flags hidden from map view
- [ ] Expired closures auto-hidden on next app load

---

### Milestone 5 — Offline & Mobile Optimisation
**Target: Week of July 27, 2026**

The app must be usable on a ride — intermittent connectivity, gloves-on UI, no waiting.

#### Tasks

**5.1 — Tile caching for offline map viewing**

Cache the OSM base map tiles for Hamilton and Tauranga bounding boxes at zoom levels 12–16.
Use `expo-file-system` to persist tiles. On load, serve cached tiles; fetch new ones in background.

**5.2 — Offline contribution queue**

When offline:
- `addFeature()` writes to local Yjs document as normal
- `SyncStatus` shows "Offline — X pending"
- On reconnect, y-websocket provider automatically replays unsynced operations
- Show a toast: "3 reports synced"

**5.3 — Mobile UX for cyclists**
- All tap targets minimum 48×48pt
- Report flow completable in under 60 seconds
- Map does not re-render unnecessarily on GPS update (throttle to 5s)
- Reduce Overpass calls: cache OSM data for 24h, refresh on pull-down

**5.4 — Network awareness**
```typescript
// src/hooks/useSyncStatus.ts — extend with NetInfo
import NetInfo from '@react-native-community/netinfo'

// On connectivity change: connect or disconnect the y-websocket provider
// Log the gap duration for research analysis
```

#### Definition of Done
- [ ] App fully usable with airplane mode on (map, reports, viewing)
- [ ] Reports made offline sync correctly after reconnection
- [ ] Report submission flow takes under 60 seconds end-to-end
- [ ] No perceptible UI lag when scrolling map on mid-range Android device

---

### Milestone 6 — User Testing
**Target: August 2026 (per Gantt chart)**

Test with real cyclists in Hamilton, then Tauranga.

#### Pre-testing checklist
- [ ] TestFlight / internal track APK distributed to participants
- [ ] Consent forms completed
- [ ] Hamilton OSM cycling data pre-cached in app
- [ ] Relay server deployed (Fly.io or Railway recommended for free tier)
- [ ] Analytics logging: feature submission count, sync gap durations, session length

#### Testing protocol
1. **Solo ride session (1 week):** Participants use app normally on their regular routes
2. **Prompted session (1 session):** Researcher rides with participant, observes contribution flow
3. **Post-session interview:** Accuracy of data, barriers to contribution, comparison to council maps

#### Metrics to collect (for dissertation)
- Number of features submitted per participant
- Time from feature submission to appearance on other devices (sync latency)
- Confirmation/flag rates (proxy for data quality)
- Feature currency: are community reports more current than council map for same area?
- Offline session duration and successful sync rate

#### Research question validation
This milestone directly addresses the three research specifications from Section 2.9:
1. Can CRDT sync maintain consistency under realistic connectivity? → measure sync latency + offline gap recovery
2. What contribution model keeps data current without burdening users? → measure submission time + dropout rate
3. Is community data more current than council-published alternatives? → manual comparison of council map vs prototype for same features

---

## Key Technical Decisions (document these in dissertation)

### Why Yjs over Automerge
Yjs has a smaller bundle size (critical for mobile), better React Native compatibility,
and the y-websocket relay is battle-tested. Automerge is more formally correct to
Shapiro et al.'s model but its JS implementation carries significant overhead.
Document this trade-off explicitly.

### Why Y.Map for features (not Y.Array)
Geographic features are addressed by ID, not position. Y.Map gives O(1) lookup
and natural last-write-wins semantics for feature updates. Y.Array would require
scanning for conflicts. The downside: concurrent deletes and re-adds of the same
ID can conflict; document this edge case.

### Why confirmations are stored separately
If confirmations were a field on the main MapFeature object, two concurrent
confirmation events would overwrite each other (last-write-wins on the whole object).
A separate `confirmations` map keyed by feature ID means each device's increment
is an independent write. Still has CRDT count drift under concurrent increments —
for dissertation purposes, document this and note that Y.Array of vote events
would be formally correct but operationally heavier.

### Why location snapping matters
Per Chatzimilioudis et al. [22], storing raw GPS traces is identifying.
Snapping to the OSM road network reduces precision by a few metres but removes
the ability to reconstruct exact movement paths. This is a deliberate privacy
design decision, not a limitation.

### Why the server is a relay only
The research question asks whether distributed sync can work without a central
arbiter. The y-websocket relay passes binary Yjs update messages without
inspecting or storing them. The authoritative state lives in each client's
Yjs document. This is the architectural claim the dissertation is testing.

---

## Overpass API Tips

- Always set `[timeout:30]` — Hamilton cycling queries are fast but good practice
- Cache responses in AsyncStorage with a 24h TTL
- If Overpass is slow, use the mirror: `https://overpass.kumi.systems/api/interpreter`
- For testing, download a `.osm.pbf` of the Waikato region from Geofabrik and
  run a local Overpass instance to avoid rate limits during development
- Key cycling tags to query: `highway=cycleway`, `cycleway=lane`, `cycleway=track`,
  `cycleway=shared_lane`, `bicycle=designated`, `lcn=yes` (local cycling network)

---

## Common Issues & Fixes

| Issue | Fix |
|---|---|
| Overpass returns empty results | Check bounding box order: must be `south,west,north,east` |
| Yjs document not syncing | Check WebSocket URL — must be `wss://` in production |
| Map not rendering on Android | Ensure Google Maps API key set in `app.json` |
| Features duplicating on reconnect | Normal during development — Yjs deduplicates by operation ID in production |
| Snap-to-road returns wrong node | Increase radius to 50m or fall back to raw coordinates with `snappedToOSM: false` |
| AsyncStorage persistence slow on first load | Load map immediately, restore CRDT state in background |

---

## Dissertation Touchpoints

As you build each milestone, keep notes for these dissertation sections:

- **Section 2.7 (CRDTs):** Record any cases where Yjs merge behaviour surprised you.
  These are direct evidence for the research question about consistency under realistic conditions.

- **Section 2.6 (Mobile Architecture):** Note any offline/reconnect edge cases.
  Phuttharak and Loke's quality control and motivation dimensions should be addressed.

- **Section 2.4 (Cycling Platforms):** Compare your contribution flow to BikeMaps.org.
  How long does a report take? What do participants say about burden?

- **Section 2.9 (R&D Specs):** Each milestone's Definition of Done maps to one or more
  of the research specifications. Track which spec each milestone addresses.

---

## Next Immediate Action

```bash
# Run this right now to get started
npx create-expo-app cycling-map --template blank-typescript
cd cycling-map
npx expo install react-native-maps expo-location @react-native-async-storage/async-storage
npm install yjs y-websocket uuid
npm install --save-dev @types/uuid

# Verify it runs
npx expo start
```

Then create `src/constants/regions.ts` with the Hamilton bounding box and
`src/osm/overpass.ts` with the cycling query. Get the map showing before
touching the CRDT layer.

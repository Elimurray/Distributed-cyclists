// Minimal Yjs WebSocket relay for local development, using the exact same yjs/y-protocols
// versions as the app's client (see src/crdt/provider.ts). We can't use the published
// @y/websocket-server package here — as of writing it internally mixes the classic `yjs`
// package with the incompatible in-progress `@y/y` (v14) rewrite via its `@y/protocols`
// dependency, which throws (`store.getClock is not a function`) on any real update, not
// just the trivial empty-doc handshake. This is adapted from the reference implementation
// y-websocket used to ship before v3 dropped its bundled server.
import http from 'http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as map from 'lib0/map'

const messageSync = 0
const messageAwareness = 1

const docs = new Map()

function getDoc(name) {
  return map.setIfUndefined(docs, name, () => {
    const doc = new Y.Doc()
    doc.awareness = new awarenessProtocol.Awareness(doc)
    doc.conns = new Map()

    doc.on('update', update => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      doc.conns.forEach((_, conn) => send(conn, message))
    })

    doc.awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients))
      const message = encoding.toUint8Array(encoder)
      doc.conns.forEach((_, conn) => send(conn, message))
    })

    return doc
  })
}

function send(conn, message) {
  if (conn.readyState !== conn.OPEN) return
  try {
    conn.send(message)
  } catch (err) {
    console.error('send failed', err)
    conn.close()
  }
}

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (conn, req) => {
  const docName = (req.url || '/').slice(1).split('?')[0]
  const doc = getDoc(docName)
  doc.conns.set(conn, new Set())
  conn.binaryType = 'arraybuffer'

  console.log(`[relay] connection opened, room="${docName}", total conns in room: ${doc.conns.size}`)

  conn.on('message', data => {
    const decoder = decoding.createDecoder(new Uint8Array(data))
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn)
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder))
        }
        break
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
        break
      }
    }
  })

  conn.on('close', () => {
    const controlledIds = doc.conns.get(conn)
    doc.conns.delete(conn)
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null)
    }
    console.log(`[relay] connection closed, room="${docName}", remaining conns: ${doc.conns.size}`)
  })

  // initial sync
  const syncEncoder = encoding.createEncoder()
  encoding.writeVarUint(syncEncoder, messageSync)
  syncProtocol.writeSyncStep1(syncEncoder, doc)
  send(conn, encoding.toUint8Array(syncEncoder))

  const awarenessStates = doc.awareness.getStates()
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, messageAwareness)
    encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
    send(conn, encoding.toUint8Array(awarenessEncoder))
  }
})

const host = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT || '1234', 10)

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('okay')
})

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, conn => {
    wss.emit('connection', conn, req)
  })
})

server.listen(port, host, () => {
  console.log(`[relay] running at '${host}' on port ${port}`)
})

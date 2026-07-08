import { WebsocketProvider } from 'y-websocket'
import { ydoc } from './ydoc'
import { RELAY_URL, ROOM_NAME } from '../constants/sync'

export const provider = new WebsocketProvider(RELAY_URL, ROOM_NAME, ydoc)

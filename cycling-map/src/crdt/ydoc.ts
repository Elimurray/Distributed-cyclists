import * as Y from 'yjs'
import { MapFeature } from '../types/feature'

export const ydoc = new Y.Doc()

export const yFeatures = ydoc.getMap<MapFeature>('features')

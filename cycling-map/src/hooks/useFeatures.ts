import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { deleteVotesForFeature, ydoc, yFeatures } from '../crdt/ydoc'
import { MapFeature } from '../types/feature'

type NewFeature = Omit<MapFeature, 'id' | 'reportedAt' | 'updatedAt'>

function snapshot(): MapFeature[] {
  return Array.from(yFeatures.values())
}

export function useFeatures() {
  const [features, setFeatures] = useState<MapFeature[]>(() => snapshot())

  useEffect(() => {
    const onChange = () => setFeatures(snapshot())
    yFeatures.observe(onChange)
    return () => yFeatures.unobserve(onChange)
  }, [])

  const addFeature = useCallback((feature: NewFeature) => {
    const now = new Date().toISOString()
    const id = uuidv4()
    const full: MapFeature = {
      ...feature,
      id,
      reportedAt: now,
      updatedAt: now,
    }
    ydoc.transact(() => {
      yFeatures.set(id, full)
    })
    return full
  }, [])

  const updateFeature = useCallback((id: string, patch: Partial<MapFeature>) => {
    const existing = yFeatures.get(id)
    if (!existing) return
    ydoc.transact(() => {
      yFeatures.set(id, { ...existing, ...patch, updatedAt: new Date().toISOString() })
    })
  }, [])

  const removeFeature = useCallback((id: string) => {
    ydoc.transact(() => {
      yFeatures.delete(id)
      deleteVotesForFeature(id)
    })
  }, [])

  return { features, addFeature, updateFeature, removeFeature }
}

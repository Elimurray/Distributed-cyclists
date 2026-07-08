import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useFeatures } from '../../hooks/useFeatures'
import { getDeviceId } from '../../crdt/device'
import { REGIONS } from '../../constants/regions'

const STATUS_COLOUR: Record<string, string> = {
  connected: '#2A9D8F',
  connecting: '#E9C46A',
  disconnected: '#E63946',
}

const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Offline',
}

export function SyncStatusBar() {
  const { status, synced, peers } = useSyncStatus()
  const { features, addFeature } = useFeatures()
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    getDeviceId().then(setDeviceId)
  }, [])

  const addTestPin = () => {
    if (!deviceId) return
    const centre = REGIONS.hamilton.center
    const jitter = () => (Math.random() - 0.5) * 0.01
    addFeature({
      type: 'hazard',
      status: 'unknown',
      coordinates: {
        lat: centre.lat + jitter(),
        lng: centre.lng + jitter(),
        snappedToOSM: false,
      },
      title: `Test pin (${deviceId.slice(0, 4)})`,
      reportedBy: deviceId,
      region: 'hamilton',
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLOUR[status] }]} />
        <Text style={styles.text}>
          {STATUS_LABEL[status]}{synced ? ' · synced' : ''} · {peers} peer{peers === 1 ? '' : 's'} · {features.length} pin{features.length === 1 ? '' : 's'}
        </Text>
      </View>
      <Pressable style={styles.button} onPress={addTestPin} disabled={!deviceId}>
        <Text style={styles.buttonText}>Add test pin</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, color: '#333', flexShrink: 1 },
  button: { backgroundColor: '#2E86AB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})

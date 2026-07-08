import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useFeatures } from '../../hooks/useFeatures'

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
  const { features } = useFeatures()

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLOUR[status] }]} />
      <Text style={styles.text}>
        {STATUS_LABEL[status]}{synced ? ' · synced' : ''} · {peers} peer{peers === 1 ? '' : 's'} · {features.length} pin{features.length === 1 ? '' : 's'}
      </Text>
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
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12, color: '#333' },
})

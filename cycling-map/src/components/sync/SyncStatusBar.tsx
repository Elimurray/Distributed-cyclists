import React, { useState } from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useFeatures } from '../../hooks/useFeatures'
import { usePendingSync } from '../../hooks/usePendingSync'
import { ErrorLogModal } from '../debug/ErrorLogModal'

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
  const pending = usePendingSync()
  const [showErrorLog, setShowErrorLog] = useState(false)

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLOUR[status] }]} />
      <Text style={styles.text}>
        {STATUS_LABEL[status]}{synced ? ' · synced' : ''} · {peers} peer{peers === 1 ? '' : 's'} · {features.length} pin{features.length === 1 ? '' : 's'}
        {pending && (
          <Text style={styles.pendingText}> · unsynced changes</Text>
        )}
      </Text>
      <Pressable onPress={() => setShowErrorLog(true)} hitSlop={8}>
        <Text style={styles.debugLink}>Debug</Text>
      </Pressable>
      <ErrorLogModal visible={showErrorLog} onClose={() => setShowErrorLog(false)} />
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
  text: { fontSize: 12, color: '#333', flex: 1 },
  pendingText: { color: '#F4A261', fontWeight: '700' },
  debugLink: { fontSize: 11, color: '#aaa', marginLeft: 8 },
})

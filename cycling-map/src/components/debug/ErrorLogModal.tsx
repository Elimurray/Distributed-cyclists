import React, { useCallback, useEffect, useState } from 'react'
import { Modal, StyleSheet, View, Text, Pressable, ScrollView } from 'react-native'
import { clearErrorLog, getErrorLog, LoggedError } from '../../debug/errorLog'

interface ErrorLogModalProps {
  visible: boolean
  onClose: () => void
}

export function ErrorLogModal({ visible, onClose }: ErrorLogModalProps) {
  const [entries, setEntries] = useState<LoggedError[]>([])

  const load = useCallback(() => {
    getErrorLog().then(setEntries)
  }, [])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  const handleClear = async () => {
    await clearErrorLog()
    load()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>Error log</Text>
          <Text style={styles.subheading}>
            {entries.length === 0 ? 'No errors recorded on this device.' : `${entries.length} recent error${entries.length === 1 ? '' : 's'} (JS-level only, most recent first)`}
          </Text>

          <ScrollView style={styles.list}>
            {entries.map((entry, i) => (
              <View key={i} style={styles.entry}>
                <Text style={styles.entryMeta}>
                  {new Date(entry.timestamp).toLocaleString()}{entry.isFatal ? ' · fatal' : ''}
                </Text>
                <Text style={styles.entryMessage}>{entry.message}</Text>
                {entry.stack && <Text style={styles.entryStack}>{entry.stack}</Text>}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonRow}>
            {entries.length > 0 && (
              <Pressable style={[styles.button, styles.clearButton]} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear log</Text>
              </Pressable>
            )}
            <Pressable style={[styles.button, styles.closeButton]} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28, maxHeight: '80%' },
  heading: { fontSize: 18, fontWeight: '700', color: '#333' },
  subheading: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 12 },
  list: { marginBottom: 12 },
  entry: { borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 10 },
  entryMeta: { fontSize: 11, color: '#888', marginBottom: 2 },
  entryMessage: { fontSize: 13, color: '#333', fontWeight: '600' },
  entryStack: { fontSize: 10, color: '#999', marginTop: 4, fontFamily: 'monospace' },
  buttonRow: { flexDirection: 'row' },
  button: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  clearButton: { backgroundColor: '#f1f1f1', marginRight: 8 },
  clearButtonText: { color: '#E63946', fontWeight: '600' },
  closeButton: { backgroundColor: '#2E86AB' },
  closeButtonText: { color: '#fff', fontWeight: '700' },
})

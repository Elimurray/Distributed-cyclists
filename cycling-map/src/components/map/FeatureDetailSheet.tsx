import React from 'react'
import { Modal, StyleSheet, View, Text, Pressable } from 'react-native'
import { MapFeature } from '../../types/feature'
import { Vote } from '../../crdt/ydoc'
import { FEATURE_TYPE_META, STATUS_LABELS } from '../../constants/featureTypes'
import { getConfidence, CONFIDENCE_META } from '../../utils/confidence'
import { timeAgo } from '../../utils/time'

interface FeatureDetailSheetProps {
  feature: MapFeature | null
  isOwner: boolean
  confirmations: number
  flags: number
  myVote: Vote | null
  onClose: () => void
  onConfirm: () => void
  onFlag: () => void
  onRemove: () => void
}

export function FeatureDetailSheet({
  feature,
  isOwner,
  confirmations,
  flags,
  myVote,
  onClose,
  onConfirm,
  onFlag,
  onRemove,
}: FeatureDetailSheetProps) {
  if (!feature) return null

  const typeMeta = FEATURE_TYPE_META[feature.type]
  const confidence = getConfidence({ confirmations, flags })
  const confidenceMeta = CONFIDENCE_META[confidence]

  return (
    <Modal visible={feature !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={[styles.typeDot, { backgroundColor: typeMeta.color }]} />
            <Text style={styles.typeLabel}>{typeMeta.label}</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceMeta.color }]}>
              <Text style={styles.confidenceBadgeText}>{confidenceMeta.label}</Text>
            </View>
          </View>

          <Text style={styles.title}>{feature.title}</Text>
          {feature.description && <Text style={styles.description}>{feature.description}</Text>}

          <Text style={styles.meta}>
            {STATUS_LABELS[feature.status]} · reported {timeAgo(feature.reportedAt)} · {confirmations} confirm{confirmations === 1 ? '' : 's'} · {flags} flag{flags === 1 ? '' : 's'}
          </Text>
          {feature.expiresAt && (
            <Text style={styles.meta}>Expires {new Date(feature.expiresAt).toLocaleDateString()}</Text>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.confirmButton, myVote === 'confirm' && styles.buttonActive]}
              onPress={onConfirm}
            >
              <Text style={styles.buttonText}>{myVote === 'confirm' ? 'Confirmed ✓' : 'Confirm'}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.flagButton, myVote === 'flag' && styles.buttonActive]}
              onPress={onFlag}
            >
              <Text style={styles.buttonText}>{myVote === 'flag' ? 'Flagged ✓' : 'Flag'}</Text>
            </Pressable>
          </View>

          {isOwner && (
            <Pressable style={styles.removeButton} onPress={onRemove}>
              <Text style={styles.removeButtonText}>Remove my report</Text>
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#666', flex: 1 },
  confidenceBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  confidenceBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  description: { fontSize: 14, color: '#555', marginTop: 6 },
  meta: { fontSize: 12, color: '#888', marginTop: 8 },
  buttonRow: { flexDirection: 'row', marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmButton: { backgroundColor: '#2A9D8F', marginRight: 8 },
  flagButton: { backgroundColor: '#F4A261' },
  buttonActive: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  removeButton: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  removeButtonText: { color: '#E63946', fontWeight: '600' },
  closeButton: { marginTop: 4, paddingVertical: 10, alignItems: 'center' },
  closeButtonText: { color: '#888' },
})

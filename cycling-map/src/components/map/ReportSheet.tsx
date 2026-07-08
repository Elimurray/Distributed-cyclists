import React, { useEffect, useState } from 'react'
import { Modal, StyleSheet, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { ConditionStatus, FeatureType } from '../../types/feature'
import { FEATURE_TYPE_META, FEATURE_TYPES, STATUSES, STATUS_LABELS } from '../../constants/featureTypes'
import { SnapResult } from '../../osm/snap'

interface ReportSheetProps {
  location: SnapResult | null
  onCancel: () => void
  onSubmit: (data: { type: FeatureType; status: ConditionStatus; title: string; description?: string }) => void
}

export function ReportSheet({ location, onCancel, onSubmit }: ReportSheetProps) {
  const [type, setType] = useState<FeatureType>('hazard')
  const [status, setStatus] = useState<ConditionStatus>(FEATURE_TYPE_META.hazard.defaultStatus)
  const [title, setTitle] = useState(FEATURE_TYPE_META.hazard.label)
  const [titleTouched, setTitleTouched] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!location) return
    setType('hazard')
    setStatus(FEATURE_TYPE_META.hazard.defaultStatus)
    setTitle(FEATURE_TYPE_META.hazard.label)
    setTitleTouched(false)
    setDescription('')
  }, [location])

  const selectType = (next: FeatureType) => {
    setType(next)
    setStatus(FEATURE_TYPE_META[next].defaultStatus)
    if (!titleTouched) setTitle(FEATURE_TYPE_META[next].label)
  }

  const submit = () => {
    if (!title.trim()) return
    onSubmit({ type, status, title: title.trim(), description: description.trim() || undefined })
  }

  return (
    <Modal visible={location !== null} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.heading}>Report an issue</Text>
            <Text style={styles.snapNote}>
              {location?.snappedToOSM
                ? 'Snapped to the nearest mapped cycleway'
                : 'Not on a mapped cycleway — placed at the tapped location'}
            </Text>

            <Text style={styles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {FEATURE_TYPES.map(t => (
                <Pressable
                  key={t}
                  onPress={() => selectType(t)}
                  style={[
                    styles.chip,
                    { borderColor: FEATURE_TYPE_META[t].color },
                    type === t && { backgroundColor: FEATURE_TYPE_META[t].color },
                  ]}
                >
                  <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{FEATURE_TYPE_META[t].label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Status</Text>
            <View style={styles.chipRow}>
              {STATUSES.map(s => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.chip, styles.statusChip, status === s && styles.statusChipActive]}
                >
                  <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{STATUS_LABELS[s]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={text => {
                setTitle(text)
                setTitleTouched(true)
              }}
              placeholder="Short summary"
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="More detail for other cyclists"
              multiline
            />

            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton, !title.trim() && styles.buttonDisabled]}
                onPress={submit}
                disabled={!title.trim()}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  heading: { fontSize: 18, fontWeight: '700', color: '#333' },
  snapNote: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  chipRow: { flexDirection: 'row' },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  statusChip: { borderColor: '#ccc' },
  statusChipActive: { backgroundColor: '#333', borderColor: '#333' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f1f1', marginRight: 8 },
  cancelButtonText: { color: '#333', fontWeight: '600' },
  submitButton: { backgroundColor: '#2E86AB' },
  submitButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
})

import React from 'react'
import { Modal, StyleSheet, View, Text, Pressable, ScrollView } from 'react-native'

interface OnboardingModalProps {
  visible: boolean
  onDismiss: () => void
}

const STEPS = [
  {
    title: 'Reports from cyclists like you',
    body: 'Hazards, closures, parking, repair stations and trail conditions, added by riders and synced across everyone’s devices — no central server keeping score.',
  },
  {
    title: 'Tap + to report something',
    body: 'Tap the + button, then tap the map where you want to report. Pick a type, add a title, and submit — it’ll snap to the nearest cycleway automatically if you’re close to one.',
  },
  {
    title: 'Confirm or flag existing pins',
    body: 'Tap any pin to see its details. Confirm it if it looks accurate, flag it if it doesn’t — that’s how the map builds confidence over time.',
  },
  {
    title: 'Works without signal',
    body: 'Reports save on your device even with no connection, and sync automatically once you’re back online.',
  },
]

export function OnboardingModal({ visible, onDismiss }: OnboardingModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome to Cycling Map</Text>
          <ScrollView style={styles.stepsScroll}>
            {STEPS.map(step => (
              <View key={step.title} style={styles.step}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Got it, let's go</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '80%' },
  heading: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 12 },
  stepsScroll: { marginBottom: 16 },
  step: { marginBottom: 16 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#2E86AB', marginBottom: 4 },
  stepBody: { fontSize: 14, color: '#555', lineHeight: 20 },
  button: { backgroundColor: '#2E86AB', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})

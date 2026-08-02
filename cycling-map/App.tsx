import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { CyclingMap } from './src/components/map/CyclingMap'
import { OnboardingModal } from './src/components/onboarding/OnboardingModal'
import { useOnboarding } from './src/hooks/useOnboarding'

export default function App() {
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding()

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <CyclingMap />
      <OnboardingModal visible={showOnboarding} onDismiss={dismissOnboarding} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

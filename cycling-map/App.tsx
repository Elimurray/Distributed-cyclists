import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { CyclingMap } from './src/components/map/CyclingMap'

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <CyclingMap />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

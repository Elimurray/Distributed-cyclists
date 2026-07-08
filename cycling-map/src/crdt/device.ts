import AsyncStorage from '@react-native-async-storage/async-storage'
import { v4 as uuidv4 } from 'uuid'

const DEVICE_ID_KEY = 'cycling-map:device-id'

let cached: string | null = null

export async function getDeviceId(): Promise<string> {
  if (cached) return cached

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (stored) {
    cached = stored
    return stored
  }

  const id = uuidv4()
  await AsyncStorage.setItem(DEVICE_ID_KEY, id)
  cached = id
  return id
}

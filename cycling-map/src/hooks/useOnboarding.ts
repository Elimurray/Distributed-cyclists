import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = 'cycling-map:onboarding-seen'

export function useOnboarding() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(seen => {
      if (!seen) setShow(true)
    })
  }, [])

  const dismiss = useCallback(() => {
    setShow(false)
    AsyncStorage.setItem(ONBOARDING_KEY, 'true')
  }, [])

  return { show, dismiss }
}

// ─── Theme Context ──────────────────────────────────────────────────────────
// Default: dark. Users can toggle.
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, ThemeColors } from '../constants/theme'

type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  mode: ThemeMode
  colors: ThemeColors
  toggle: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: Colors.dark,
  toggle: () => {},
  isDark: true,
})

const STORAGE_KEY = 'raven_theme_mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setMode(stored)
      }
    })
  }, [])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const colors = Colors[mode]
  const isDark = mode === 'dark'

  return (
    <ThemeContext.Provider value={{ mode, colors, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

import { useState, useEffect } from 'react'
import { getTheme, ThemeConfig } from '../config/themes'

export type ThemeName = 'light' | 'dark' | 'xipz' | 'ogDark' | 'ogLight'

export function useTheme() {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (document.documentElement.classList.contains('ogLight')) return 'ogLight'
    if (document.documentElement.classList.contains('ogDark')) return 'ogDark'
    if (document.documentElement.classList.contains('xipz')) return 'xipz'
    if (document.documentElement.classList.contains('dark')) return 'dark'
    return 'light'
  })

  const [theme, setTheme] = useState<ThemeConfig>(() => getTheme(themeName))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      let newThemeName: ThemeName = 'light'
      if (document.documentElement.classList.contains('ogLight')) {
        newThemeName = 'ogLight'
      } else if (document.documentElement.classList.contains('ogDark')) {
        newThemeName = 'ogDark'
      } else if (document.documentElement.classList.contains('xipz')) {
        newThemeName = 'xipz'
      } else if (document.documentElement.classList.contains('dark')) {
        newThemeName = 'dark'
      }
      
      if (newThemeName !== themeName) {
        setThemeName(newThemeName)
        setTheme(getTheme(newThemeName))
      }
    })
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [themeName])

  return { theme, themeName }
}
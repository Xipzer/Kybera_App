import { useState, useEffect } from 'react'
import { getTheme, ThemeConfig } from '../config/themes'

export function useTheme() {
  const [themeName, setThemeName] = useState<'light' | 'dark' | 'xipz'>(() => {
    if (document.documentElement.classList.contains('xipz')) return 'xipz'
    if (document.documentElement.classList.contains('dark')) return 'dark'
    return 'light'
  })

  const [theme, setTheme] = useState<ThemeConfig>(() => getTheme(themeName))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      let newThemeName: 'light' | 'dark' | 'xipz' = 'light'
      if (document.documentElement.classList.contains('xipz')) {
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
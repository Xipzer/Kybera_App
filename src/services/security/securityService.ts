/**
 * Code by Xipzer
 */

class SecurityService {
  private suspiciousPatterns = [
    /eval\s*\(/,
    /new\s+Function\s*\(/,
    /document\.write/,
    /innerHTML\s*=/,
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ]

  initializeSecurityMeasures() {
    if (typeof window !== 'undefined') {
      Object.freeze(window.crypto)
      Object.freeze(window.crypto.subtle)

      Object.freeze(Object.prototype)
      Object.freeze(Array.prototype)
      Object.freeze(Function.prototype)

      this.detectSuspiciousExtensions()

      this.monitorDOMChanges()
    }
  }

  sanitizeInput(input: string): string {
    let sanitized = input.replace(/<[^>]*>/g, '')

    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        console.warn('Suspicious pattern detected in input')
        sanitized = sanitized.replace(pattern, '')
      }
    }

    return sanitized.trim()
  }

  private detectSuspiciousExtensions() {
    const suspiciousGlobals = ['web3', '__REACT_DEVTOOLS_GLOBAL_HOOK__']

    if (import.meta.env.PROD) {
      suspiciousGlobals.forEach((global) => {
        if (global in window) {
          console.warn(`Detected potential extension interference: ${global}`)
        }
      })
    }

    const knownGlobals = new Set(Object.keys(window))
    setInterval(() => {
      Object.keys(window).forEach((key) => {
        if (!knownGlobals.has(key)) {
          console.warn(`New global variable detected: ${key}`)
          knownGlobals.add(key)
        }
      })
    }, 5000)
  }

  private monitorDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                console.error('Unauthorized script injection detected!')
                element.remove()
              }
              if (element.tagName === 'IFRAME') {
                console.warn('Iframe injection detected')
                element.remove()
              }
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  isSecureContext(): boolean {
    if (typeof window === 'undefined') return true

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.error('App must be served over HTTPS!')
      return false
    }

    if (window.self !== window.top) {
      console.error('App cannot be embedded in an iframe!')
      return false
    }

    return true
  }
}

export const securityService = new SecurityService()
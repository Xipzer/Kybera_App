// Security service to protect against XSS and malicious extensions
class SecurityService {
  private suspiciousPatterns = [
    /eval\s*\(/,
    /new\s+Function\s*\(/,
    /document\.write/,
    /innerHTML\s*=/,
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onload, etc.
  ]

  // Freeze critical objects to prevent tampering
  initializeSecurityMeasures() {
    // Freeze crypto functions
    if (typeof window !== 'undefined') {
      // Freeze Web Crypto API
      Object.freeze(window.crypto)
      Object.freeze(window.crypto.subtle)
      
      // Freeze important prototypes
      Object.freeze(Object.prototype)
      Object.freeze(Array.prototype)
      Object.freeze(Function.prototype)
      
      // Detect and block suspicious browser extensions
      this.detectSuspiciousExtensions()
      
      // Monitor for DOM tampering
      this.monitorDOMChanges()
    }
  }

  // Sanitize user input
  sanitizeInput(input: string): string {
    // Remove any potential script injections
    let sanitized = input.replace(/<[^>]*>/g, '') // Remove HTML tags
    
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        console.warn('Suspicious pattern detected in input')
        sanitized = sanitized.replace(pattern, '')
      }
    }
    
    return sanitized.trim()
  }

  // Detect suspicious browser extensions
  private detectSuspiciousExtensions() {
    // Check for known malicious extension signatures
    const suspiciousGlobals = [
      'web3',
      '__REACT_DEVTOOLS_GLOBAL_HOOK__', // Allow dev tools in dev mode only
    ]

    if (import.meta.env.PROD) {
      suspiciousGlobals.forEach(global => {
        if (global in window) {
          console.warn(`Detected potential extension interference: ${global}`)
        }
      })
    }

    // Monitor for new global variables
    const knownGlobals = new Set(Object.keys(window))
    setInterval(() => {
      Object.keys(window).forEach(key => {
        if (!knownGlobals.has(key)) {
          console.warn(`New global variable detected: ${key}`)
          knownGlobals.add(key)
        }
      })
    }, 5000)
  }

  // Monitor DOM for malicious changes
  private monitorDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              // Check for script injection
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                console.error('Unauthorized script injection detected!')
                element.remove()
              }
              // Check for suspicious iframes
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

  // Secure context check
  isSecureContext(): boolean {
    if (typeof window === 'undefined') return true
    
    // Check for HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.error('App must be served over HTTPS!')
      return false
    }

    // Check for iframe embedding
    if (window.self !== window.top) {
      console.error('App cannot be embedded in an iframe!')
      return false
    }

    return true
  }
}

export const securityService = new SecurityService()
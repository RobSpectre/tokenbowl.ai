// Unified analytics tracking for PostHog and Google Analytics

export function trackEvent(eventName, properties = {}) {
  // Send to PostHog
  if (window.posthog) {
    window.posthog.capture(eventName, properties)
  }

  // Send to Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, properties)
  }
}

// Track page views
export function trackPageView(pageName, properties = {}) {
  trackEvent('page_view', {
    page_name: pageName,
    ...properties
  })
}

// Track button clicks
export function trackButtonClick(buttonName, properties = {}) {
  trackEvent('button_click', {
    button_name: buttonName,
    ...properties
  })
}

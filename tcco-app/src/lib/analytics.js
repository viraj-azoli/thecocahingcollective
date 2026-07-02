import posthog from 'posthog-js';

export function initAnalytics() {
  if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: true,
      persistence: 'localStorage',
    });
  }
}

export function identify(userId, traits = {}) {
  if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.identify(userId, traits);
  }
}

export function track(event, props = {}) {
  if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.capture(event, props);
  } else {
    console.log('[analytics]', event, props);
  }
}

export function reset() {
  if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.reset();
  }
}

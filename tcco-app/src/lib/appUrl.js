// Absolute base URL of the app, e.g. https://thecoachingcollectiveonline.com/app
//
// Email templates build links as `${appUrl}/coaches`. Passing
// window.location.origin alone drops the /app segment the SPA is served
// under, so every emailed link 404s on the marketing site instead.
export function appBaseUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return (window.location.origin + base).replace(/\/+$/, '');
}

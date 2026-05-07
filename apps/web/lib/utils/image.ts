/**
 * Returns true when Next.js image optimization should be bypassed.
 *
 * Convex storage URLs are fine to optimize (low latency, no blocking).
 * External CDNs like Shopify's make server-side proxy requests that their
 * CDN rate-limits or blocks, causing 7-12s timeouts in the /_next/image route.
 * Those should go directly to the browser instead.
 */
export function isUnoptimizedUrl(url: string): boolean {
  return (
    url.includes('convex.cloud') ||
    url.includes('convex.site') ||
    url.includes('cdn.shopify.com')
  );
}

/**
 * Shared signed-URL cache for private course media.
 * One stable URL per object for ~50 min so remounts/rerenders never swap the
 * image/PDF source (which visibly reloaded and moved the media on phones/tablets).
 */
const TTL_MS = 50 * 60 * 1000;
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

const key = (bucket: string, path: string) => `${bucket}/${path}`;

export function getCachedSignedUrl(bucket: string, path: string, now = Date.now()): string | null {
  const hit = cache.get(key(bucket, path));
  return hit && hit.expires > now ? hit.url : null;
}

export function signCourseObject(
  bucket: string,
  path: string,
  sign: () => Promise<string | null>,
  now = () => Date.now(),
): Promise<string | null> {
  const cached = getCachedSignedUrl(bucket, path, now());
  if (cached) return Promise.resolve(cached);
  const k = key(bucket, path);
  const pending = inflight.get(k);
  if (pending) return pending;
  const p = sign()
    .then((url) => {
      if (url) cache.set(k, { url, expires: now() + TTL_MS });
      return url;
    })
    .catch(() => null)
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

export function __resetSignedCourseUrlCache() { cache.clear(); inflight.clear(); }

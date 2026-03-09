/**
 * Safe localStorage wrapper for Safari private mode and other restrictive browsers.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('[safeStorage] getItem failed:', key, e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error('[safeStorage] setItem failed:', key, e);
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('[safeStorage] removeItem failed:', key, e);
    return false;
  }
}

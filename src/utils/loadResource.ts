export type LoadState = 'loading' | 'ready' | 'cached' | 'stale' | 'error';

// Only cache confirmed query results, never unsaved form values or partial lists.
export async function loadResource<T>(
  key: string,
  query: () => Promise<T>,
  hasPreviousData: boolean,
  apply: (data: T) => void,
  validateCache: (data: unknown) => boolean,
): Promise<LoadState> {
  try {
    const data = await query();
    apply(data);
    try { localStorage.setItem(`obrahub_read_v1_${key}`, JSON.stringify({ data })); } catch { /* Storage can be unavailable. */ }
    return 'ready';
  } catch {
    if (hasPreviousData) return 'stale';
    try {
      const raw = localStorage.getItem(`obrahub_read_v1_${key}`);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Object.prototype.hasOwnProperty.call(cached, 'data') && validateCache(cached.data)) {
          apply(cached.data);
          return 'cached';
        }
      }
    } catch { /* Invalid cache is treated as unavailable. */ }
    return 'error';
  }
}

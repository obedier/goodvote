interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  SEARCH_SUGGESTIONS: 'search_suggestions',
  DONORS: 'donors',
  CONTRIBUTIONS: 'contributions',
  EXPENDITURES: 'expenditures',
  CONGRESS_MEMBERS: 'congress_members',
  LOBBYING_OVERVIEW: 'lobbying_overview',
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTLS = {
  SEARCH_SUGGESTIONS: 10 * 60 * 1000, // 10 minutes
  DONORS: 5 * 60 * 1000, // 5 minutes
  CONTRIBUTIONS: 5 * 60 * 1000, // 5 minutes
  EXPENDITURES: 5 * 60 * 1000, // 5 minutes
  CONGRESS_MEMBERS: 30 * 60 * 1000, // 30 minutes
  LOBBYING_OVERVIEW: 60 * 60 * 1000, // 1 hour
} as const; 
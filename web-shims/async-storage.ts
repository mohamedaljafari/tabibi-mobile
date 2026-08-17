/**
 * Minimal web shim for @react-native-async-storage/async-storage.
 *
 * Metro is configured to swap this module in on the web platform
 * (see metro.config.js). It implements the AsyncStorage surface the
 * application actually uses: getItem / setItem / removeItem /
 * multiGet / multiSet / getAllKeys / clear.
 *
 * Kept in sync with the local-first storage layer so browser previews,
 * the standalone admin web panel, and Vercel deployments behave the
 * same way as the mobile apps.
 */

const PREFIX = "tabibi:asn1:";

type Listener = (keys: string[]) => void;

const listeners = new Set<Listener>();

function notifyChange(keys: string[]): void {
  for (const listener of listeners) {
    try {
      listener(keys);
    } catch {
      /* ignore listener errors */
    }
  }
}

export default {
  setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        localStorage.setItem(PREFIX + key, value);
        notifyChange([key]);
      } finally {
        resolve();
      }
    });
  },

  getItem(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        resolve(localStorage.getItem(PREFIX + key));
      } catch {
        resolve(null);
      }
    });
  },

  removeItem(key: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem(PREFIX + key);
        notifyChange([key]);
      } finally {
        resolve();
      }
    });
  },

  multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    return Promise.resolve(
      keys.map((key) => [key, (() => {
        try {
          return localStorage.getItem(PREFIX + key);
        } catch {
          return null;
        }
      })()] as [string, string | null]),
    );
  },

  multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    return new Promise((resolve) => {
      try {
        for (const [key, value] of keyValuePairs) {
          localStorage.setItem(PREFIX + key, value);
        }
        notifyChange(keyValuePairs.map(([key]) => key));
      } finally {
        resolve();
      }
    });
  },

  getAllKeys(): Promise<string[]> {
    return new Promise((resolve) => {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith(PREFIX)) {
            keys.push(key.slice(PREFIX.length));
          }
        }
        resolve(keys);
      } catch {
        resolve([]);
      }
    });
  },

  clear(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const keys: string[] = [];
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
          const key = localStorage.key(i);
          if (key && key.startsWith(PREFIX)) {
            keys.push(key.slice(PREFIX.length));
            localStorage.removeItem(key);
          }
        }
        notifyChange(keys);
      } finally {
        resolve();
      }
    });
  },

  addEventListener(_event: string, listener: Listener): { remove(): void } {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },

  removeEventListener(_event: string, listener: Listener): void {
    listeners.delete(listener);
  },
};

export type { Listener };

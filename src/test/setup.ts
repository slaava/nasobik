import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// Node 22+ defines an experimental global `localStorage` that is `undefined`
// unless started with --localstorage-file. Because the key already exists on
// globalThis, vitest's jsdom environment does not install jsdom's Storage in
// its place. Fall back to a minimal in-memory Storage so code that uses
// localStorage (device-level settings such as e-ink mode) can be tested.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: k => store.get(k) ?? null,
    key: i => [...store.keys()][i] ?? null,
    removeItem: k => { store.delete(k) },
    setItem: (k, v) => { store.set(k, String(v)) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
}

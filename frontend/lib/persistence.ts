// frontend/lib/persistence.ts

export function loadFromLocalStorage<T>(key: string, validate?: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

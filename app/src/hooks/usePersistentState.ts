import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initialValue: T, validate: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? initialValue : validate(JSON.parse(saved))
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // The interface still works when storage is unavailable.
    }
  }, [key, value])

  return [value, setValue] as const
}

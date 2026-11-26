import { useEffect, useState } from 'react'

export type WeatherReport = {
  place: string
  temperature: number
  high: number
  low: number
  code: number
  isDay: boolean
}

type GeocodeResponse = {
  results?: { name: string; latitude: number; longitude: number }[]
}

type ForecastResponse = {
  current?: { temperature_2m: number; weather_code: number; is_day: number }
  daily?: { temperature_2m_max: number[]; temperature_2m_min: number[] }
}

const REFRESH_MS = 30 * 60 * 1000

/** Current conditions from Open-Meteo for a city name. Returns null until loaded or when no city is set. */
export function useWeather(city: string, unit: 'celsius' | 'fahrenheit') {
  const [report, setReport] = useState<WeatherReport | null>(null)
  const query = city.trim()

  useEffect(() => {
    if (!query) return
    let cancelled = false
    let location: { name: string; latitude: number; longitude: number } | null = null

    const load = async () => {
      try {
        if (!location) {
          const geocode = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&format=json`,
          )
          if (!geocode.ok) return
          location = ((await geocode.json()) as GeocodeResponse).results?.[0] ?? null
          if (!location) return
        }
        const forecast = await fetch(
          'https://api.open-meteo.com/v1/forecast'
          + `?latitude=${location.latitude}&longitude=${location.longitude}`
          + '&current=temperature_2m,weather_code,is_day'
          + '&daily=temperature_2m_max,temperature_2m_min'
          + `&temperature_unit=${unit}&timezone=auto&forecast_days=1`,
        )
        if (!forecast.ok) return
        const data = (await forecast.json()) as ForecastResponse
        if (!data.current || !data.daily) return
        const next: WeatherReport = {
          place: location.name,
          temperature: Math.round(data.current.temperature_2m),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          code: data.current.weather_code,
          isDay: data.current.is_day === 1,
        }
        const valid = [next.temperature, next.high, next.low, next.code].every(Number.isFinite)
        if (!cancelled && valid) setReport(next)
      } catch {
        // Offline or blocked: keep showing the last report, or nothing.
      }
    }

    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [query, unit])

  return query ? report : null
}

/** WMO weather code → short label. */
export function describeWeather(code: number) {
  if (code === 0) return 'Clear'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Foggy'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow'
  if (code >= 95) return 'Thunderstorms'
  return 'Mixed'
}

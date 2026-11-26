/**
 * HDMI connection status from the Samsung TV (Tizen SystemInfo "VIDEOSOURCE").
 * Returns { portNumber: connected } for each HDMI port the TV reports.
 */

import { withTimeout } from './tizen'
import type { TizenVideoSource } from './tizen'

export type HdmiStatus = Record<number, boolean>

/** For the laptop preview and tests: localStorage 'ourhome-mock-hdmi' = '{"1":true,"3":false}'. */
const MOCK_KEY = 'ourhome-mock-hdmi'

function readMock(): HdmiStatus | null {
  try {
    const raw = window.localStorage.getItem(MOCK_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const status: HdmiStatus = {}
    for (const [port, connected] of Object.entries(parsed)) {
      if (Number.isInteger(Number(port)) && typeof connected === 'boolean') status[Number(port)] = connected
    }
    return status
  } catch {
    return null
  }
}

/** True on the TV, or when a preview mock is set; false in a normal browser. */
export function canDetectHdmi() {
  return Boolean(window.tizen?.systeminfo) || readMock() !== null
}

/** Current HDMI status, or null if it could not be read this time. */
export async function readHdmiStatus(): Promise<HdmiStatus | null> {
  const mock = readMock()
  if (mock) return mock

  const systeminfo = window.tizen?.systeminfo
  if (!systeminfo) return null

  try {
    const sources = await withTimeout<TizenVideoSource>((resolve, reject) => (
      systeminfo.getPropertyValue('VIDEOSOURCE', resolve, reject)
    ))
    const status: HdmiStatus = {}
    for (const source of sources.disconnected ?? []) if (source.type === 'HDMI') status[source.number] = false
    for (const source of sources.connected ?? []) if (source.type === 'HDMI') status[source.number] = true
    return status
  } catch {
    return null
  }
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export const arrowDirections: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/** Visible, focusable elements inside a container, in document order. */
export function focusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((element) => element.getClientRects().length > 0)
}

/** True when nothing useful has focus, so remote keys would otherwise go nowhere. */
export function focusIsLost(root: HTMLElement | null | undefined) {
  const active = document.activeElement
  return !active || active === document.body || !root || !root.contains(active)
}

/**
 * Move focus to the nearest focusable element in a direction, like a TV remote.
 * Left/right stay within the same row; up/down pick the closest element above/below.
 */
export function moveFocus(root: HTMLElement, from: Element | null, direction: Direction) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((element) => element !== from && element.getClientRects().length > 0)

  if (!(from instanceof HTMLElement) || !root.contains(from)) {
    focusAndReveal(candidates[0])
    return
  }

  // An explicit target wins, e.g. data-nav-down=".shelf-row .app-tile" → first app tile.
  const explicit = from.dataset[`nav${direction[0].toUpperCase()}${direction.slice(1)}`]
  if (explicit) {
    const target = candidates.find((element) => element.matches(explicit))
    if (target) {
      focusAndReveal(target)
      return
    }
  }

  const origin = from.getBoundingClientRect()
  const originX = origin.left + origin.width / 2
  const originY = origin.top + origin.height / 2
  let best: HTMLElement | undefined
  let bestScore = Infinity

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const horizontal = direction === 'left' || direction === 'right'

    if (horizontal) {
      const sharesRow = rect.top < origin.bottom - 4 && rect.bottom > origin.top + 4
      if (!sharesRow) continue
      if (direction === 'right' ? x <= originX + 1 : x >= originX - 1) continue
    } else if (direction === 'down' ? y <= originY + 1 : y >= originY - 1) {
      continue
    }

    const gap = horizontal
      ? (direction === 'right' ? rect.left - origin.right : origin.left - rect.right)
      : (direction === 'down' ? rect.top - origin.bottom : origin.top - rect.bottom)
    const offset = horizontal ? Math.abs(y - originY) : Math.abs(x - originX)
    const score = Math.max(gap, 0) + offset * (horizontal ? 2 : 0.6)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  focusAndReveal(best)
}

/** Focus without letting the browser scroll the TV stage, then scroll the nearest marked area. */
export function focusAndReveal(element: HTMLElement | undefined | null) {
  if (!element) return
  element.focus({ preventScroll: true })
  const area = element.closest<HTMLElement>('[data-scroll-area]')
  if (!area) return

  const scale = area.getBoundingClientRect().width / area.offsetWidth || 1
  const bounds = area.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  const margin = 40 * scale

  if (rect.right > bounds.right - margin) area.scrollLeft += (rect.right - bounds.right + margin) / scale
  else if (rect.left < bounds.left + margin) area.scrollLeft -= (bounds.left + margin - rect.left) / scale
  if (rect.bottom > bounds.bottom - margin) area.scrollTop += (rect.bottom - bounds.bottom + margin) / scale
  else if (rect.top < bounds.top + margin) area.scrollTop -= (bounds.top + margin - rect.top) / scale
}

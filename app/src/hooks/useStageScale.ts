import { useEffect, useState } from 'react'

export const STAGE_WIDTH = 1920
export const STAGE_HEIGHT = 1080

function measure() {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
  return {
    scale,
    left: Math.round((window.innerWidth - STAGE_WIDTH * scale) / 2),
    top: Math.round((window.innerHeight - STAGE_HEIGHT * scale) / 2),
  }
}

/** Fits a fixed 1920×1080 TV stage into any window, so the laptop preview matches the TV. */
export function useStageScale() {
  const [stage, setStage] = useState(measure)

  useEffect(() => {
    const update = () => setStage(measure())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return stage
}
